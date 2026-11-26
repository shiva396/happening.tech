const { eachBrowser, preview } = require("./browser.cjs");

function percentile(samples, fraction) {
  const sorted = [...samples].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(sorted.length * fraction) - 1].toFixed(1));
}

async function sample(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await context.newPage();
    let idleArchives = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".lottie") && request.url().includes("/animals/"))
        idleArchives++;
    });
    await page.goto(url);
    await page.waitForFunction(() => customElements.get("nav-performance") !== undefined);
    await page.waitForTimeout(750);
    const archives = idleArchives;
    const link = page.getByRole("link", { name: "World view", exact: true });
    await link.evaluate((node) => {
      window.koalaSample = new Promise((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error("Koala did not advance")), 10000);
        node.addEventListener(
          "pointerenter",
          () => {
            const start = performance.now();
            let first, previous;
            const gaps = [];
            function frame() {
              const now = performance.now();
              const clip = node.querySelector(".nav-back dotlottie-wc")?.dotLottie;
              if (first === undefined && clip?.currentFrame >= 1) first = now;
              if (first !== undefined) {
                if (previous !== undefined) gaps.push(now - previous);
                previous = now;
                if (now - first >= 1500) {
                  clearTimeout(deadline);
                  resolve({ latency: first - start, gaps });
                  return;
                }
              }
              requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
          },
          { once: true },
        );
      });
    });
    await link.hover();
    return { ...(await page.evaluate(() => window.koalaSample)), archives };
  } finally {
    await context.close();
  }
}

eachBrowser(async (browser, name) => {
  const urls = { branch: preview };
  if (process.env.BASELINE_URL) urls.main = process.env.BASELINE_URL;
  const samples = Object.fromEntries(Object.keys(urls).map((key) => [key, []]));
  for (let trial = 0; trial < 5; trial++) {
    const entries = Object.entries(urls);
    for (const [key, url] of trial % 2 ? entries.reverse() : entries) {
      samples[key].push(await sample(browser, url));
    }
  }
  for (const [build, runs] of Object.entries(samples)) {
    console.log(
      JSON.stringify({
        browser: name,
        build,
        trials: runs.length,
        medianIdleArchives: percentile(
          runs.map((r) => r.archives),
          0.5,
        ),
        medianFirstFrameMs: percentile(
          runs.map((r) => r.latency),
          0.5,
        ),
        p95FrameIntervalMs: percentile(
          runs.flatMap((r) => r.gaps),
          0.95,
        ),
      }),
    );
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
