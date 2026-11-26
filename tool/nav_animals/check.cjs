const assert = require("node:assert/strict");
const { chromium, firefox, webkit } = require("playwright-core");
async function check() {
  const name = process.env.BROWSER_ENGINE || "chromium";
  const engine = { chromium, firefox, webkit }[name];
  if (!engine) throw new Error("Unknown browser engine: " + name);
  const browser = await engine.launch(
    engine === chromium
      ? {
          executablePath: process.env.CHROME_BIN,
        }
      : {},
  );
  try {
    const page = await browser.newPage();
    const base = process.env.PREVIEW_URL || "http://localhost:4173";
    await page.goto(base);
    const nav = page.locator("nav-performance");
    assert.deepEqual(await nav.evaluateAll((nodes) => nodes.map((node) => node.dataset.animal)), [
      "monkey",
      "koala",
    ]);
    await page.waitForFunction(() => customElements.get("nav-performance") !== undefined);
    assert.equal(await nav.locator("dotlottie-wc").count(), 0);
    const programme = page.getByRole("link", { name: "Programme", exact: true });
    const world = page.getByRole("link", { name: "World view", exact: true });
    await programme.hover();
    await page.waitForFunction(
      () => document.querySelector('[data-animal="monkey"] dotlottie-wc')?.dotLottie?.isPlaying,
    );
    assert.equal(await page.locator('[data-animal="koala"] dotlottie-wc').count(), 0);
    await world.hover();
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".nav-back dotlottie-wc")].filter((el) => el.dotLottie?.isPlaying)
          .length === 2,
    );
    for (const actor of await nav.all()) {
      const timing = await actor.evaluate((node) => {
        const [back, front] = [...node.querySelectorAll("dotlottie-wc")].map((el) => el.dotLottie);
        return [back.duration, back.activeAnimationId, front.activeAnimationId];
      });
      assert.deepEqual(timing, [10, "body", "paws"]);
    }
    await page.waitForFunction(() => {
      const bodies = [...document.querySelectorAll(".nav-back dotlottie-wc")];
      return bodies.length === 2 && bodies.every((el) => el.dotLottie?.currentFrame >= 160);
    });
    for (const actor of await nav.all()) {
      const planes = await actor.evaluate((node) =>
        [...node.querySelectorAll(".nav-plane")].map((plane) => {
          const c = plane.firstElementChild.shadowRoot.querySelector("canvas");
          const rgba = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
          return {
            z: Number(getComputedStyle(plane).zIndex),
            pixels: rgba.filter((v, i) => i % 4 === 3 && v > 80).length,
          };
        }),
      );
      assert(planes[0].z < 1 && planes[1].z > 1 && planes[1].pixels > 0 && planes[0].pixels > planes[1].pixels);
    }
    await page.waitForFunction(() => !document.querySelector("nav-performance dotlottie-wc"), null, {
      timeout: 12000,
    });
    await programme.hover();
    await page.waitForFunction(
      () => document.querySelector('[data-animal="monkey"] dotlottie-wc')?.dotLottie?.isPlaying,
    );
    await world.click();
    await page.waitForURL(/\/world\/?$/);
    await page.mouse.move(0, 0);
    await page.waitForFunction(
      () => document.querySelector('[data-animal="koala"] dotlottie-wc')?.dotLottie?.isPlaying,
    );
    await page.waitForFunction(() => !document.querySelector("nav-performance dotlottie-wc"), null, {
      timeout: 14000,
    });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".nav-back dotlottie-wc")].filter((el) => el.dotLottie?.isPlaying)
          .length === 2,
      null,
      { timeout: 60000 },
    );
    const elapsed = await page.evaluate(
      () => Date.now() - Number(sessionStorage.getItem("nav-performance:" + document.baseURI + ":beat")),
    );
    assert(elapsed >= 0 && elapsed < 8000, "Both animals should play on the first scheduled beat");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector("nav-performance dotlottie-wc"));
    const keyboard = await browser.newPage();
    await keyboard.goto(base);
    await keyboard.keyboard.press("Tab");
    const keyboardWorld = keyboard.getByRole("link", { name: "World view", exact: true });
    await keyboardWorld.focus();
    await keyboard.waitForFunction(
      () => document.querySelector('[data-animal="koala"] dotlottie-wc')?.dotLottie?.isPlaying,
    );
    await keyboard.keyboard.press("Enter");
    await keyboard.waitForURL(/\/world\/?$/);
    await keyboard.waitForFunction(
      () => document.querySelector('[data-animal="koala"] dotlottie-wc')?.dotLottie?.isPlaying,
    );
    await keyboard.close();
    const touch = await browser.newPage({
      hasTouch: true,
      isMobile: engine !== firefox,
      viewport: { width: 390, height: 844 },
    });
    await touch.goto(base);
    await touch.waitForFunction(() => customElements.get("nav-performance") !== undefined);
    await touch.getByRole("link", { name: "World view", exact: true }).tap();
    await touch.waitForURL(/\/world\/?$/);
    await touch.waitForFunction(
      () => document.querySelector('[data-animal="koala"] dotlottie-wc')?.dotLottie?.isPlaying,
    );
    console.log(
      "Verified hover replay, keyboard, click and tap across navigation, layered animation, shared minute playback and reduced motion.",
    );
  } finally {
    await browser.close();
  }
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
