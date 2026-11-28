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
    const diameter = () => globe.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue("--hit-size")));
    const initialDiameter = await diameter();
    const geography = (x, y) => page.evaluate(async ([x, y]) => {
      // Input can arrive between paints. Read the camera label and diameter after the queued draw.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const { unproject } = await import(new URL("world/camera.js", document.baseURI).href);
      const earth = document.querySelector(".atlas-earth");
      const r = parseFloat(getComputedStyle(earth).getPropertyValue("--hit-size")) / 2;
      const rect = earth.getBoundingClientRect();
      const [, lat, ns, lon, ew] = document.querySelector(".coordinates").textContent.match(/([\d.]+)° ([NS])\s*\/\s*([\d.]+)° ([EW])/);
      return unproject((x - rect.x - rect.width/2) / r, (rect.y + rect.height/2 - y) / r, {
        latitude: Number(lat) * (ns === "N" ? 1 : -1), longitude: Number(lon) * (ew === "E" ? 1 : -1),
      });
    }, [x, y]);
    // Choose an unobstructed point on the globe to start a native touch gesture.
    const point = await globe.evaluate((el) => {
      const r = el.getBoundingClientRect();
      for (const dy of [0.12, -0.12, 0.22, -0.22])
        for (const dx of [0, 0.12, -0.12]) {
          const x = r.x + r.width * (0.5 + dx),
            y = r.y + r.height * (0.5 + dy);
          if ([-26, 0, 26].every((offset) => document.elementFromPoint(x + offset, y) === el)) return { x, y };
        }
      throw Error("No exposed globe surface");
    });
    const { x, y } = point;
    const anchor = await geography(x, y);
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
    // Move the midpoint while holding the spread, then pinch back to the original size.
    const shift = 18;
    await touch("touchMove", [[x - 48 + shift, y + shift], [x + 48 + shift, y + shift]]);
    await page.waitForFunction(w => parseFloat(getComputedStyle(document.querySelector(".atlas-earth")).getPropertyValue("--hit-size")) > 3.6*w, initialDiameter);
    const anchored = await geography(x + shift, y + shift);
    assert(Math.abs(anchor[0] - anchored[0]) < .2 && Math.abs(anchor[1] - anchored[1]) < .2, `Geography follows the moving pinch midpoint: ${anchor} -> ${anchored}`);
    for (let i = 1; i <= 8; i++)
      await touch("touchMove", [[x - 48 + i * 3 + shift, y + shift], [x + 48 - i * 3 + shift, y + shift]]);
    await touch("touchEnd", []);
    await page.waitForFunction(w => Math.abs(parseFloat(getComputedStyle(document.querySelector(".atlas-earth")).getPropertyValue("--hit-size")) - w) <= 1, initialDiameter);
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
    const rail = page.getByRole("scrollbar", { name: "Scroll atlas content" });
    await rail.press("Home");
    const points = await rail.evaluate(el => {
      const track = el.querySelector(".scroll-track"), rect = el.getBoundingClientRect();
      return Array.from({length: 11}, (_, index) => {
        const point = track.getPointAtLength(track.getTotalLength() * index / 10);
        return [rect.x + point.x, rect.y + point.y];
      });
    });
    await touch("touchStart", [points[0]]);
    for (const point of points.slice(1)) await touch("touchMove", [point]);
    await touch("touchEnd", []);
    await page.waitForFunction(() => {
      const reader = document.querySelector("#atlas-reader");
      return reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 1;
    });
    await page.setViewportSize({width: 320, height: 568});
    await page.goto(new URL("?event=flutter-tech-summit-2027#world", preview).href);
    await page.locator(".world-focused").waitFor();
    const sheet = await page.locator("#world-preview").boundingBox();
    const pin = await page.locator(".world-focused").boundingBox();
    const dock = await page.locator(".world-dock").boundingBox();
    assert(pin.y + pin.height < sheet.y && sheet.y + sheet.height < dock.y, "Mobile sheet clears the marker and dock");
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
    // The curve uses the original pin and card-edge coordinates, including vertical leaders.
    await desktop.locator(".world-cards").evaluate(layer => {
      const buttons = [...layer.querySelectorAll(".world-postcard")];
      for (const [i, group] of [...layer.querySelectorAll(".world-leader")].entries()) {
        const line = group.querySelector("path");
        const [ax, ay, qx, qy, cx, cy] = line.getAttribute("d").match(/-?[\d.]+/g).map(Number);
        const pin = group.querySelector("circle");
        const box = buttons[i].getBoundingClientRect(), frame = layer.getBoundingClientRect();
        const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
        if (ax !== Number(pin.getAttribute("cx")) || ay !== Number(pin.getAttribute("cy")) ||
            Math.abs(cx - clamp(ax, box.x-frame.x+8, box.right-frame.x-8)) > .11 ||
            Math.abs(cy - clamp(ay, box.y-frame.y+5, box.bottom-frame.y-5)) > .11)
          throw Error("Moved leader endpoint");
        if (Math.hypot(cx-ax, cy-ay) > 2 && Math.abs((qx-ax)*(cy-ay)-(qy-ay)*(cx-ax)) < .1)
          throw Error("Leader has no bend");
      }
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
    // At world scale every visible postcard can represent multiple communities.
    // Follow the clusters into a city before selecting an individual listing.
    for (let level = 0; level < 4 && !(await card.count()); level++) {
      const cluster = desktop.locator(".world-stack").first();
      const previous = await cluster.elementHandle();
      await cluster.click();
      await desktop.waitForFunction(button => !button.isConnected, previous);
    }
    await card.click();
    await desktop.locator("#world-preview h3").waitFor();
    const sidePanel = await desktop.locator("#world-preview").boundingBox();
    assert(sidePanel.x > 1440 * .66 && sidePanel.x + sidePanel.width < 1440);
    await desktop.locator(".atlas-info summary").click();
    assert.match(await desktop.locator(".atlas-credit").innerText(), /Made with 💙 by Justin and Shiva from NammaFlutter/);
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
    await fallback.route("**/art/world-surface.*", (r) => r.abort());
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
    await detail.route("**/art/world-detail/*", async route => {
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
    assert(requests.some(url => Number(url.match(/world-detail\/(\d+)\.avif/)?.[1]) >= 128), "Deep zoom fetches full-resolution satellite tiles");
    assert(!coarse.equals(await detail.screenshot({ clip })), "Zoom detail changes rendered geography at the same camera position.");
    const fallbackTile = canvas.waitForResponse("**/art/world-detail/*.webp");
    await canvas.locator("[data-camera=in]").click();
    await fallbackTile;
    await canvas.waitForLoadState("networkidle");
    assert(await canvas.locator(".world-surface").evaluate(c => c.width >= c.clientWidth));
    await detail.unroute("**/art/world-detail/*");
    await detail.route("**/art/world-detail/*.avif", route => route.abort());
    const parentTile = detail.waitForResponse(response => /world-detail\/\d+\.webp$/.test(response.url()) && response.ok());
    await detail.goto(new URL("?event=flutter-tech-summit-2027#world", preview).href);
    await parentTile;
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
