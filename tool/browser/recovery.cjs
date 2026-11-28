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
    await page.waitForFunction(() => scrollY > 20);
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
    const dash = await browser.newPage();
    await dash.route("**/art/dash.glb", (r) => r.abort());
    await dash.goto(preview);
    const bird = dash.getByRole("button", { name: "Say hello to Dash" });
    await bird.click({ clickCount: 3, delay: 30 });
    await dash.locator('[data-dash-state="celebrating"]').waitFor();
    assert(await bird.locator("img").isVisible());
    await dash.getByRole("link", { name: "Program view", exact: true }).click();
    await dash.locator("[data-perch=program] [data-dash]").waitFor();
    await dash.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await dash.locator("[data-dash] canvas").count(), 0);
    console.log("Native touch, keyboard, Canvas, unavailable textures, reduced motion and Dash recovery passed.");
  } finally {
    await browser.close();
  }
}
check().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
