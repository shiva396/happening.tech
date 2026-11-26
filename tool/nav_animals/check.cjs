const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
async function check() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const base = process.env.PREVIEW_URL || "http://localhost:4173";
    await page.goto(base);
    const nav = page.locator("nav-performance");
    assert.deepEqual(await nav.evaluateAll((nodes) => nodes.map((node) => node.dataset.animal)), [
      "monkey",
      "koala",
    ]);
    await page.getByRole("link", { name: "World view", exact: true }).hover();
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
    await page.waitForFunction(
      () => document.querySelector(".nav-back dotlottie-wc")?.dotLottie?.currentFrame >= 160,
    );
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
    const remaining = await page.evaluate(() => Number(sessionStorage.getItem("nav-rest-monkey")) - Date.now());
    assert(remaining > 57000 && remaining <= 60000);
    await page.reload();
    await page.waitForTimeout(50);
    assert.equal(await nav.locator("dotlottie-wc").count(), 0);
    await page.waitForTimeout(54_000);
    assert.equal(await nav.locator("dotlottie-wc").count(), 0);
    await page.locator('[data-animal="monkey"] .nav-back dotlottie-wc').waitFor({state: "attached", timeout: 9_000});
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector("nav-performance dotlottie-wc"));
    console.log(
      "Verified both complete ten-second takes, separated body and paw pixels, persistent cooldown and replay.",
    );
  } finally {
    await browser.close();
  }
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
