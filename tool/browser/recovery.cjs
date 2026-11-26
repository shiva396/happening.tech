const assert = require("node:assert/strict");
const { eachBrowser, preview } = require("./browser.cjs");

async function interruptedAnimation(page) {
  let requests = 0;
  let releaseDownload;
  const held = new Promise((resolve) => {
    releaseDownload = resolve;
  });
  await page.route("**/motion/animals/monkey.lottie", async (route) => {
    requests++;
    if (requests === 1) {
      await route.fulfill({ contentType: "application/octet-stream", body: "incomplete archive" });
    } else {
      await held;
      await route.continue();
    }
  });
  await page.goto(preview);
  await page.waitForFunction(() => customElements.get("nav-performance") !== undefined);
  const link = page.getByRole("link", { name: "Programme", exact: true });
  const actor = page.locator('[data-animal="monkey"]');
  // Install both observers before the first hover. The decoder can reject both planes in a single frame.
  await actor.evaluate((node) => {
    window.removedPlayers = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const removed of record.removedNodes) {
          if (removed.nodeName === "DOTLOTTIE-WC") window.removedPlayers++;
        }
      }
    }).observe(node, { subtree: true, childList: true });
  });
  await link.hover();
  await page.waitForFunction(() => window.removedPlayers === 2);
  assert.equal(await actor.locator("dotlottie-wc").count(), 0);

  await page.mouse.move(0, 0);
  const retry = page.waitForRequest("**/motion/animals/monkey.lottie", { timeout: 12000 });
  await Promise.all([retry, link.hover()]);
  try {
    await page.mouse.move(0, 0);
    await link.hover();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  } finally {
    releaseDownload();
  }
  await page.waitForFunction(
    () =>
      performance.getEntriesByType("resource").filter((entry) => entry.name.endsWith("/monkey.lottie"))
        .length >= 2,
  );
  assert.equal(await actor.locator("dotlottie-wc").count(), 0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(0, 0);
  await link.hover();
  await page.waitForFunction(
    () => document.querySelector('[data-animal="monkey"] dotlottie-wc')?.dotLottie?.isPlaying,
  );
  assert.equal(await actor.locator("dotlottie-wc").count(), 2);
  assert.equal(requests, 2);
  await page.getByRole("link", { name: "World view", exact: true }).click();
  await page.waitForURL(/\/world\/?$/);
}

async function failedMapImage(page) {
  let requests = 0;
  await page.route("**/art/earth-satellite.webp", (route) =>
    ++requests === 1
      ? route.fulfill({ status: 503, headers: { "cache-control": "no-store" }, body: "" })
      : route.continue(),
  );
  const satellite = page.getByRole("button", { name: "Satellite", exact: true });
  await satellite.click();
  await page.locator(".map-status").waitFor();
  assert.equal(await page.locator('[data-map-style="terrain"]').getAttribute("aria-pressed"), "true");
  assert(await page.locator(".earth-surface:not(.satellite-surface)").isVisible());
  await satellite.click();
  await page.locator(".country-atlas.satellite-view").waitFor();
  assert(await page.locator(".map-status").isHidden());
  assert.equal(requests, 2);
}

async function touchZoom(browser) {
  const page = await browser.newPage({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    await page.goto(new URL("world/", preview.endsWith("/") ? preview : preview + "/").href);
    const globe = page.locator("#country-globe");
    await globe.scrollIntoViewIfNeeded();
    const stage = await globe.boundingBox();
    const x = Math.round(stage.x + stage.width / 2),
      y = Math.round(stage.y + stage.height / 2);
    const client = await page.context().newCDPSession(page);
    const touch = (type, positions) =>
      client.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: positions.map(([dx, dy], id) => ({ x: x + dx, y: y + dy, id: id + 1 })),
      });
    const radius = () =>
      page.evaluate(async () => {
        // Allow input dispatch and the next globe paint to complete.
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        return Number(document.querySelector(".globe-focus").getAttribute("r"));
      });
    const initial = await radius();
    await touch("touchStart", [
      [-30, -20],
      [30, 20],
    ]);
    for (const offset of [-15, -30, 0, 30]) {
      await touch("touchMove", [
        [-30, offset - 20],
        [30, offset + 20],
      ]);
      assert.equal(await radius(), initial, "Parallel fingers should preserve zoom");
    }
    await touch("touchMove", [
      [-60, -10],
      [60, 70],
    ]);
    await page.waitForFunction(
      (r) => Number(document.querySelector(".globe-focus").getAttribute("r")) > r * 1.9,
      initial,
    );
    await touch("touchMove", [
      [-27, 12],
      [27, 48],
    ]);
    await page.waitForFunction(
      (r) => Number(document.querySelector(".globe-focus").getAttribute("r")) < r,
      initial,
    );
    await touch("touchCancel", []);
    const last = await radius();
    await touch("touchStart", [[0, 0]]);
    await touch("touchMove", [[20, 10]]);
    await touch("touchEnd", []);
    assert.equal(await radius(), last, "A fresh one-finger drag should only rotate");
  } finally {
    await page.close();
  }
}

eachBrowser(async (browser, name) => {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await interruptedAnimation(page);
  await failedMapImage(page);
  if (browser.browserType().name() === "webkit") {
    const globe = page.locator("#country-globe");
    const initial = Number(await page.locator(".globe-focus").getAttribute("r"));
    await globe.evaluate((svg) => {
      svg.dispatchEvent(new Event("gesturestart", { cancelable: true }));
      const change = Object.assign(new Event("gesturechange", { cancelable: true }), { scale: 1.5 });
      svg.dispatchEvent(change);
      svg.dispatchEvent(new Event("gestureend"));
    });
    await page.waitForFunction(
      (r) => Number(document.querySelector(".globe-focus").getAttribute("r")) > r * 1.4,
      initial,
    );
  }
  if (browser.browserType().name() === "chromium") {
    await touchZoom(browser);
    console.log(name + " passed two-contact slide, pinch, spread and cancellation.");
  }
  assert.deepEqual(errors, []);
  console.log(
    name +
      " recovered from a corrupt archive, interrupted download, repeated hover, and failed satellite image.",
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
