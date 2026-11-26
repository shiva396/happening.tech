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
    for (const name of ["monkey", "koala"]) {
      await page.evaluate((name) => studio.sculpt(name), name);
      const poses = [];
      for (let i = 0; i < 150; i++) {
        const { back, front, ...contacts } = await page.evaluate((t) => studio.render(t), i / 15);
        for (const [plane, image] of [
          ["body", back],
          ["paws", front],
        ]) {
          if (!image) continue;
          const file = name + "-" + plane + "-" + i + ".png";
          const { data, info } = await sharp(Buffer.from(image, "base64"))
            .trim({ background: "#00000000", threshold: 3 })
            .png({ palette: true, colours: 128, dither: 0 })
            .toBuffer({ resolveWithObject: true });
          await fs.writeFile(path.join(frames, file), data);
          contacts[plane] = {
            file,
            width: info.width,
            height: info.height,
            left: -info.trimOffsetLeft,
            top: -info.trimOffsetTop,
          };
        }
        poses.push(contacts);
      }
      await fs.writeFile(path.join(frames, name + ".json"), JSON.stringify(poses));
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
