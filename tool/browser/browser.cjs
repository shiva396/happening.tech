const { chromium, firefox, webkit } = require("playwright-core");

const engines = { chromium, firefox, webkit };
const preview = process.env.PREVIEW_URL || "http://localhost:4173/";

async function eachBrowser(check) {
  for (const name of process.env.BROWSER_ENGINE ? [process.env.BROWSER_ENGINE] : Object.keys(engines)) {
    if (!engines[name]) throw new Error("Unknown browser engine: " + name);
    const executablePath = name === "chromium" ? process.env.CHROME_BIN : undefined;
    const browser = await engines[name].launch({ executablePath });
    try {
      await check(browser, (process.env.BROWSER_LABEL || name) + " " + browser.version());
    } finally {
      await browser.close();
    }
  }
}

module.exports = { eachBrowser, preview };
