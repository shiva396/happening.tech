const { readFileSync } = require("node:fs");
const { chromium } = require("playwright-core");
const { preview } = require("./browser.cjs");

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

async function sample(browser, mobile) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
  });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (mobile) {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 80,
        downloadThroughput: 4e6 / 8,
        uploadThroughput: 1e6 / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await page.addInitScript(() => {
      const observations = (window.vitals = { lcp: 0, cls: 0, interactions: {}, lcpElement: null });
      let sessionStart = 0,
        lastShift = 0,
        sessionScore = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          observations.lcp = e.startTime;
          observations.lcpElement = e.element?.className || e.element?.tagName;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          if (e.startTime - lastShift > 1000 || e.startTime - sessionStart > 5000) {
            sessionScore = 0;
            sessionStart = e.startTime;
          }
          lastShift = e.startTime;
          sessionScore += e.value;
          observations.cls = Math.max(observations.cls, sessionScore);
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (e.interactionId)
            observations.interactions[e.interactionId] = Math.max(
              e.duration,
              observations.interactions[e.interactionId] || 0,
            );
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    });
    await page.goto(preview);
    await page.locator('.atlas-earth[data-rendered="true"] .world-postcard').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    const network = await page.evaluate(() => {
      const entries = [performance.getEntriesByType("navigation")[0], ...performance.getEntriesByType("resource")];
      return {
        requests: entries.length,
        transferredKiB: Math.round(entries.reduce((sum, e) => sum + e.transferSize, 0) / 1024),
      };
    });
    const gpu = await page.locator(".world-surface").evaluate((canvas) => {
      const gl = canvas.getContext("webgl");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "Canvas or masked GPU";
    });
    // Capture frame intervals during a real zoom animation.
    await page.locator("[data-camera=in]").evaluate((button) => {
      button.addEventListener(
        "click",
        () => {
          window.zoomFrames = new Promise((resolve) => {
            const gaps = [];
            let first, previous;
            function frame(t) {
              first ??= t;
              if (previous !== undefined) gaps.push(t - previous);
              previous = t;
              if (t - first >= 700) resolve(gaps);
              else requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
          });
        },
        { once: true },
      );
    });
    const gpuSamples = [];
    const counter = process.env.GPU_BUSY_PATH;
    const sampler = counter && setInterval(() => gpuSamples.push(Number(readFileSync(counter, "utf8"))), 50);
    let gaps;
    try {
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      gaps = await page.evaluate(() => window.zoomFrames);
    } finally {
      clearInterval(sampler);
    }
    await page.getByRole("button", { name: "Reset orientation" }).click();
    await page.getByRole("link", { name: "Program view", exact: true }).click();
    await page.locator("[data-filter=q]").pressSequentially("flutter", { delay: 75 });
    await page.locator("[data-period=past]").click();
    await page.waitForTimeout(500);
    const { lcp, cls, interactions, lcpElement } = await page.evaluate(() => window.vitals);
    if (!lcp) throw Error("Browser did not report a largest contentful paint");
    const heap = await cdp.send("Runtime.getHeapUsage");
    return {
      lcpMs: Math.round(lcp),
      lcpElement,
      cls: +cls.toFixed(4),
      // With fewer than 50 interactions the longest event is the lab visit's INP candidate.
      // Entries below the browser's 16 ms reporting floor are recorded as an upper bound.
      inpUpperBoundMs: Math.max(16, ...Object.values(interactions)),
      frameMedianMs: +percentile(gaps, 0.5).toFixed(1),
      frameP95Ms: +percentile(gaps, 0.95).toFixed(1),
      ...network,
      ...(gpuSamples.length ? { deviceGpuBusyMedianPercent: percentile(gpuSamples, 0.5) } : {}),
      jsHeapMiB: +(heap.usedSize / 2 ** 20).toFixed(1),
      gpu,
    };
  } finally {
    await context.close();
  }
}
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: process.env.NATIVE_GPU ? ["--enable-gpu", "--use-angle=gl"] : ["--enable-unsafe-swiftshader"],
  });
  try {
    for (const mobile of [false, true]) {
      const trials = [];
      for (let i = 0; i < 3; i++) trials.push(await sample(browser, mobile));
      console.log(JSON.stringify({ browser: browser.version(), mobile, trials }));
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
