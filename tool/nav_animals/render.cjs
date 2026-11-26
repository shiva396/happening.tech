// Offline build dependencies: three@0.180.0, playwright-core and sharp.
// Run with `node tool/nav_animals/render.cjs`. Set CHROME_BIN for a non-default Chrome.
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const sharp = require("sharp");
const { chromium } = require("playwright-core");

async function bake() {
  const frames = await fs.mkdtemp(path.join(os.tmpdir(), "nav-poses-"));
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.evaluate(() => {
      window.exports = {};
    });
    await page.addScriptTag({ path: require.resolve("three") });
    await page.addScriptTag({ path: path.join(__dirname, "studio.js") });
    await page.evaluate(() => {
      window.studio = createStudio(window.exports);
    });
    const names = JSON.parse(await fs.readFile(path.join(__dirname, "cast.json"), "utf8"));
    for (const name of Object.keys(names)) {
      await page.evaluate((name) => studio.sculpt(name), name);
      for (const mode of ["hop", "orbit"]) {
        // Sprite poses repeat. Position and depth are interpolated independently at display rate.
        const poses = await page.evaluate(
          (mode) => Array.from({ length: 24 }, (_, i) => studio.render(i / 24, mode)),
          mode,
        );
        await Promise.all(
          poses.map((data, i) =>
            sharp(Buffer.from(data, "base64"))
              .png({ palette: true, colours: 128, dither: 0 })
              .toFile(path.join(frames, name + "-" + mode + "-" + i + ".png")),
          ),
        );
      }
      console.log("Rendered", name);
    }
    execFileSync("python3", [path.join(__dirname, "physics.py"), frames], { stdio: "inherit" });
  } finally {
    await browser.close();
    await fs.rm(frames, { recursive: true, force: true });
  }
}
bake().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
