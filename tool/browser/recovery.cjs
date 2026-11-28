const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { preview } = require("./browser.cjs");

async function check() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await page.goto(preview);
    const stage = page.locator('.atlas-earth[data-rendered="true"]');
    await stage.waitFor();
    const coordinates = page.locator(".coordinates");
    const home = await coordinates.textContent();
    const globe = page.getByRole("group", { name: /Interactive globe\. Drag/ });
    await globe.focus();
    await globe.press("ArrowRight");
    await page.waitForFunction((s) => document.querySelector(".coordinates").textContent !== s, home);
    await globe.press("Home");
    await page.waitForFunction((s) => document.querySelector(".coordinates").textContent === s, home);
    const r = await globe.boundingBox();
    // Choose an unobstructed point on the globe to start a native touch gesture.
    const point = await globe.evaluate((el) => {
      const r = el.getBoundingClientRect();
      for (const dy of [0, 0.12, -0.12, 0.22, -0.22])
        for (const dx of [0, 0.12, -0.12]) {
          const x = r.x + r.width * (0.5 + dx),
            y = r.y + r.height * (0.5 + dy);
          if ([-26, 0, 26].every((offset) => document.elementFromPoint(x + offset, y) === el)) return { x, y };
        }
      throw Error("No exposed globe surface");
    });
    const { x, y } = point;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, points) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map(([x, y], id) => ({ id: id + 1, x, y })),
      });
    await touch("touchStart", [
      [x - 24, y],
      [x + 24, y],
    ]);
    for (let i = 1; i <= 8; i++)
      await touch("touchMove", [
        [x - 24 - i * 3, y],
        [x + 24 + i * 3, y],
      ]);
    await touch("touchEnd", []);
    await page.waitForFunction(
      (w) => parseFloat(document.querySelector(".world-touch").style.getPropertyValue("--hit-size")) > w * 1.5,
      r.width,
    );
    await page.getByRole("button", { name: "Reset orientation" }).click();
    await touch("touchStart", [[x, y]]);
    for (let i = 1; i <= 10; i++) await touch("touchMove", [[x, y - i * 10]]);
    await touch("touchEnd", []);
    await page.waitForFunction((s) => document.querySelector(".coordinates").textContent !== s, home);
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.getByRole("link", { name: "Program view", exact: true }).click();
    await page.locator("[data-period=past]").click();
    const panel = await page.locator(".globe-pages").boundingBox();
    const sx = panel.x + panel.width * 0.5,
      sy = panel.y + panel.height * 0.76;
    await touch("touchStart", [[sx, sy]]);
    for (let i = 1; i <= 12; i++) await touch("touchMove", [[sx, sy - i * 12]]);
    await touch("touchEnd", []);
    await page.waitForFunction(() => document.querySelector(".globe-pages").scrollTop > 20);
    assert.equal(await page.evaluate(() => scrollY), 0);
    const desktop = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    await desktop.goto(preview);
    await desktop.locator('.atlas-earth[data-rendered="true"]').waitFor();
    const start = await desktop.locator(".world-touch").evaluate((el) => {
      const r = el.getBoundingClientRect();
      for (const dy of [0, 0.1, -0.1, 0.2])
        for (const dx of [0, 0.1, -0.1]) {
          const x = r.x + r.width * (0.5 + dx),
            y = r.y + r.height * (0.5 + dy);
          if (document.elementFromPoint(x, y) === el) return { x, y };
        }
      throw Error("No exposed globe surface");
    });
    const initial = await desktop.locator(".coordinates").textContent();
    await desktop.mouse.move(start.x, start.y);
    await desktop.mouse.down();
    await desktop.mouse.move(start.x + 70, start.y + 12, { steps: 6 });
    await desktop.mouse.up();
    await desktop.waitForFunction(
      (before) => document.querySelector(".coordinates").textContent !== before,
      initial,
    );
    const card = desktop.locator(".world-postcard:not(.world-stack)").first();
    await card.click();
    await desktop.locator("#world-preview h3").waitFor();
    await desktop.goto(preview);
    await desktop.locator('.atlas-earth[data-rendered="true"]').waitFor();
    // The opening camera is centered over land in Saudi Arabia, which has no catalog records.
    const earth = await desktop.locator(".atlas-earth").boundingBox();
    await desktop.mouse.click(earth.x + earth.width / 2, earth.y + earth.height / 2);
    await desktop.getByRole("heading", { name: "Saudi Arabia" }).waitFor();
    const land = new URL(desktop.url());
    assert.equal(land.hash, "#place");
    assert.equal(Number(land.searchParams.get("lat")), 25);
    assert.equal(Number(land.searchParams.get("lon")), 42);
    assert(await desktop.locator("#place").getByText("No local community has been listed yet.").isVisible());
    await desktop.reload();
    await desktop.getByRole("heading", { name: "Saudi Arabia" }).waitFor();
    await desktop.getByRole("link", { name: "Globe", exact: true }).click();
    await desktop.locator("#world-preview h3").filter({ hasText: "Saudi Arabia" }).waitFor();
    const detailsUrl = new URL("events/flutter-tech-summit-2027/", preview).href;
    await desktop.route(detailsUrl, (route) => route.abort());
    await desktop.goto(new URL("#events/flutter-tech-summit-2027", preview).href);
    const retry = desktop.locator("#globe-story").getByRole("link", { name: "Open the full page" });
    await retry.waitFor();
    await desktop.unroute(detailsUrl);
    await retry.click();
    await desktop.locator(".permalink .globe-pages article h1").waitFor();
    await desktop.close();
    const canvas = await browser.newPage({ reducedMotion: "reduce" });
    await canvas.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.includes("webgl") ? null : original.call(this, type, ...args);
      };
    });
    await canvas.goto(preview);
    await canvas.locator('[data-engine="canvas"][data-rendered="true"]').waitFor();
    await canvas.locator(".world-touch").press("ArrowLeft");
    await canvas.waitForFunction(() => document.querySelector(".coordinates").textContent.includes("32.0° E"));
    const fallback = await browser.newPage({ reducedMotion: "reduce" });
    await fallback.route("**/art/world-surface.webp", (r) => r.abort());
    await fallback.goto(preview);
    await fallback.locator(".world-postcard").first().waitFor();
    assert(await fallback.locator(".atlas-earth-poster").isVisible());
    await fallback.getByRole("link", { name: "Program view", exact: true }).click();
    await fallback.locator("[data-period=past]").click();
    assert(await fallback.locator(".event-card:visible").first().isVisible());
    const detail = await browser.newPage({
      reducedMotion: "reduce", viewport: { width: 960, height: 640 }, deviceScaleFactor: 2,
    });
    const requests = [];
    detail.on("request", (request) => requests.push(request.url()));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await detail.route("**/art/world-detail/*.webp", async route => {
      await gate;
      await route.continue();
    });
    await detail.goto(preview);
    await detail.locator('[data-engine="webgl"][data-rendered="true"]').waitFor();
    assert.equal(await detail.locator("[data-dash], [data-perch]").count(), 0);
    assert(!requests.some(url => /world-detail|\/dash[/.]/i.test(url)));
    const tile = detail.waitForRequest("**/art/world-detail/41.webp"); // Opening camera, 25° N / 42° E.
    await detail.getByRole("button", { name: "Zoom in", exact: true }).click();
    await tile;
    for (let i = 0; i < 4; i++) await detail.locator("[data-camera=in]").click();
    await detail.waitForFunction(() => document.querySelector(".world-surface").width === 1920);
    const clip = { x: 445, y: 285, width: 70, height: 70 };
    const coarse = await detail.screenshot({ clip });
    release();
    await detail.waitForLoadState("networkidle");
    await detail.waitForFunction(() => {
      const gl = document.querySelector(".world-surface").getContext("webgl");
      const program = gl.getParameter(gl.CURRENT_PROGRAM);
      return gl.getUniform(program, gl.getUniformLocation(program, "useDetail"));
    });
    assert(!coarse.equals(await detail.screenshot({ clip })), "Zoom detail changes rendered geography at the same camera position.");
    const fallbackTile = canvas.waitForResponse("**/art/world-detail/*.webp");
    await canvas.locator("[data-camera=in]").click();
    await fallbackTile;
    await canvas.waitForLoadState("networkidle");
    assert(await canvas.locator(".world-surface").evaluate(c => c.width >= c.clientWidth));
    await detail.unroute("**/art/world-detail/*.webp");
    await detail.route("**/art/world-detail/*.webp", route => route.abort());
    await detail.goto(new URL("?event=flutter-tech-summit-2027#world", preview).href);
    await detail.waitForLoadState("networkidle");
    assert(await detail.locator('[data-engine="webgl"][data-rendered="true"]').isVisible());
    assert(await detail.locator("#world-preview h3").isVisible());
    assert(!requests.some(url => /\/dash[/.]/i.test(url)));
    console.log("Touch, keyboard, WebGL and software zoom detail, failed textures, and reduced motion passed.");
  } finally {
    await browser.close();
  }
}
check().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
