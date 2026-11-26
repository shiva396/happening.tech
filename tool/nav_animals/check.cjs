// Check the foreground markers against the actual WASM renderer and Jaspr markup.
const assert = require("node:assert/strict");
const {chromium} = require("playwright-core");

async function check() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const base = process.env.PREVIEW_URL || "http://localhost:4173";
    for (const [path, move] of [["/", "hop"], ["/world/", "orbit"]]) {
      await page.goto(new URL(path, base).href);
      const names = (await page.locator("nav-playground").getAttribute("data-cast")).split(" ");
      const seen = new Set();
      const selector = '[data-move="' + move + '"] dotlottie-wc';
      for (let i = 0; i < names.length; i++) {
        await page.waitForFunction(({selector, seen}) => {
          const player = document.querySelector(selector);
          return player?.dotLottie?.isPlaying && !seen.includes(player.dataset.animal);
        }, {selector, seen: [...seen]}, {timeout: 7000});
        const result = await page.locator(selector).evaluate(async (player, move) => {
          const clip = player.dotLottie;
          const marks = clip.markers();
          const take = marks.find(mark => mark.name === move);
          const front = marks.find(mark => mark.name === move + "-front");
          async function depthAt(frame) {
            clip.setFrame(frame);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return player.parentElement.hasAttribute("data-front");
          }
          clip.pause();
          const foreground = await depthAt(front.start + 1);
          const background = await depthAt(take.start + 1);
          clip.setFrame(take.end - 3);
          clip.play();
          return {animal: player.dataset.animal, foreground, background};
        }, move);
        assert(result.foreground && !result.background, result.animal + " depth cues");
        seen.add(result.animal);
      }
      assert.deepEqual(seen, new Set(names));
    }
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.locator(".nav-animal dotlottie-wc").waitFor({state:"detached"});
    console.log("Verified both motion tracks, depth markers and a full shuffle of the Jaspr cast.");
  } finally {
    await browser.close();
  }
}
check().catch(error => { console.error(error); process.exitCode = 1; });
