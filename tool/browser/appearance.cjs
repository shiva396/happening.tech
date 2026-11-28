const assert = require("node:assert/strict");
const { eachBrowser, preview } = require("./browser.cjs");

eachBrowser(async (browser, name) => {
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, colorScheme: "dark" });
  try {
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const railRequests = [];
    page.on("request", request => { if (request.url().endsWith("/scrollbar.js")) railRequests.push(request.url()); });
    await page.goto(preview);
    const toggle = page.getByRole("button", { name: "Dark theme", exact: true });
    const rail = page.getByRole("scrollbar", { name: "Scroll atlas content" });
    const waitForTheme = theme => page.waitForFunction(t =>
      document.documentElement.dataset.theme === t && !document.documentElement.dataset.iris, theme);
    await waitForTheme("dark");
    await page.emulateMedia({ colorScheme: "light" });
    await waitForTheme("light");
    await page.emulateMedia({ colorScheme: "dark" });
    await waitForTheme("dark");
    await page.locator(".world-touch").waitFor();
    await page.evaluate(() => {
      window.irisPasses = [];
      const root = document.documentElement;
      new MutationObserver(() => {
        if (!root.dataset.iris) return;
        const disk = document.querySelector(".world-touch").getBoundingClientRect();
        const layer = document.querySelector(".theme-iris");
        window.irisPasses.push({
          pass: root.dataset.iris,
          origin: root.style.getPropertyValue("--iris-origin"),
          edge: parseFloat(root.style.getPropertyValue("--iris-edge")),
          diameter: disk.width,
          lastClip: layer?.getAnimations()[0]?.effect.getKeyframes().at(-1)?.clipPath,
        });
      }).observe(root, { attributes: true, attributeFilter: ["data-iris"] });
    });
    await toggle.click();
    await waitForTheme("light");
    const [globe, screen] = await page.evaluate(() => window.irisPasses);
    assert.equal(globe.pass, "globe");
    assert.equal(screen.pass, "screen");
    assert.equal(globe.origin, "550px 380px");
    assert.equal(screen.origin, globe.origin);
    assert(Math.abs(parseFloat(globe.lastClip.match(/circle\(([\d.]+)/)[1]) - globe.diameter / 2) < 1);
    assert(screen.edge >= Math.hypot(550, 380));
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");

    // Reverse a change while snapshot capture is pending. A cancelled transition must leave no overlay.
    await toggle.click();
    await page.waitForFunction(() => document.documentElement.dataset.iris === "screen");
    await toggle.evaluate(el => el.click());
    await waitForTheme("light");
    assert.equal(await page.locator(".theme-iris").count(), 0);
    assert.equal(railRequests.length, 0);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(new URL("#program", preview).href);
    await rail.waitFor();
    assert.equal(railRequests.length, 1);
    const reader = page.locator("#atlas-reader");
    const fraction = () => reader.evaluate(el => el.scrollTop / (el.scrollHeight - el.clientHeight));
    const track = await rail.evaluate(el => {
      const path = el.querySelector(".scroll-track"), length = path.getTotalLength();
      const start = path.getPointAtLength(0), middle = path.getPointAtLength(length/2), end = path.getPointAtLength(length);
      const box = el.getBoundingClientRect();
      return { x: box.x + start.x, top: box.y + start.y, bottom: box.y + end.y,
        midX: box.x + middle.x, midY: box.y + middle.y, endX: box.x + end.x };
    });
    const box = await reader.boundingBox();
    assert(Math.abs(track.x - track.endX) < .5 && track.midX - track.x > 20);
    assert(Math.abs(track.top - box.y) <= 4 && Math.abs(track.bottom - box.y - box.height) <= 4);
    assert(Math.abs(track.x - box.x - box.width) < 10);
    await rail.press("End");
    assert(await fraction() > .99);
    await rail.press("Home");
    assert.equal(await fraction(), 0);
    await page.mouse.move(track.x, track.top + 2);
    await page.mouse.down();
    await page.mouse.move(track.midX, track.midY, {steps: 5});
    await page.mouse.move(track.endX, track.bottom, {steps: 5});
    await page.mouse.up();
    assert(await fraction() > .99);
    await rail.press("PageUp");
    assert(await fraction() < .99);
    await page.mouse.move(track.midX, track.midY);
    await page.mouse.wheel(0, -1500);
    await page.waitForFunction(() => document.querySelector("#atlas-reader").scrollTop === 0);
    await page.setViewportSize({ width: 1400, height: 960 });
    await page.getByRole("searchbox", { name: "Search events" }).fill("nothing matches this place");
    await rail.waitFor({state: "hidden"});
    await page.getByRole("searchbox", { name: "Search events" }).fill("");
    await rail.waitFor();

    await page.goto(new URL("archive/", preview).href);
    await waitForTheme("light");
    await rail.waitFor();
    await rail.press("End");
    const before = await reader.evaluate(el => el.scrollTop);
    await toggle.click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    assert.equal(await page.locator(".theme-iris").count(), 0);
    assert.equal(await reader.evaluate(el => el.scrollTop), before);
    await page.reload();
    await waitForTheme("dark");
    // An OS change leaves an explicit choice in force. Another tab can change it.
    await page.emulateMedia({ colorScheme: "light" });
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    const other = await context.newPage();
    await other.goto(preview);
    await other.emulateMedia({ reducedMotion: "reduce" });
    await other.getByRole("button", { name: "Dark theme" }).click();
    await waitForTheme("light");
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await rail.press("End");
    assert(await fraction() > .99);
    assert.deepEqual(errors, []);
    console.log(name + " passed two-stage theme switching, theme persistence, reduced motion and the curved scrollbar.");
  } finally {
    await context.close();
  }
}).catch(e => { console.error(e); process.exitCode = 1; });
