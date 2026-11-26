const assert = require("node:assert/strict");
const { createECDH } = require("node:crypto");
const { chromium } = require("playwright-core");
const { preview } = require("./browser.cjs");

async function check() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  try {
    const page = await browser.newPage();
    const root = new URL(preview.endsWith("/") ? preview : preview + "/");
    const endpoint = new URL("test-subscriptions", root).href;
    const publicKey = createECDH("prime256v1").generateKeys().toString("base64url");
    await page.goto(root.href);
    for (const [name, animation] of [["Notifications", "bell"], ["Contribute", "pull-request"]]) {
      const action = page.getByRole("link", {name, exact:true});
      await action.focus();
      await action.locator(`[data-motion="${animation}"][data-playing]`).waitFor({ state:"attached" });
    }
    await page.goto(new URL("notifications/", root).href);
    assert(await page.getByRole("link", {name:/feed reader/}).isVisible());

    // Exercise the real settings script and service worker on a Pages subpath,
    // replacing the browser vendor and remote subscription store with fixtures.
    const methods = [];
    let failSave = true;
    await page.route(endpoint, async route => {
      methods.push(route.request().method());
      await route.fulfill({status: failSave ? 503 : 204, body:""});
    });
    await page.evaluate(({ publicKey, endpoint }) => {
      const toggle = document.createElement("button");
      toggle.id = "push-toggle";
      toggle.hidden = true;
      Object.assign(toggle.dataset, { publicKey, endpoint });
      document.querySelector(".notice-settings").append(toggle);
      window.permissionRequests = 0;
      window.revocations = 0;
      Notification.requestPermission = async () => { window.permissionRequests++; return "granted"; };
      PushManager.prototype.getSubscription = async () => null;
      PushManager.prototype.subscribe = async () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/example",
        toJSON() { return {endpoint:this.endpoint, keys:{}}; },
        async unsubscribe() { window.revocations++; return true; },
      });
    }, { publicKey, endpoint });
    await page.addScriptTag({url:new URL("notifications.js", root).href});
    const toggle = page.locator("#push-toggle");
    await toggle.waitFor();
    assert.equal(await page.evaluate(() => window.permissionRequests),0);
    await toggle.click();
    await page.getByRole("status").filter({hasText:/try again/i}).waitFor();
    assert.equal(await page.evaluate(() => window.revocations),1);
    failSave = false;
    await toggle.click();
    await page.getByRole("status").filter({hasText:/are on/}).waitFor();
    await toggle.click();
    await page.getByRole("status").filter({hasText:/are off/}).waitFor();
    assert.deepEqual(methods, ["POST","POST","DELETE"]);
    const registrations = await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).map(r=>r.scope));
    assert(registrations.includes(new URL("push/", root).href));
    console.log("Community animations, permission timing, failed save, opt-in, opt-out, and worker scope passed.");
  } finally { await browser.close(); }
}

check().catch(error => { console.error(error); process.exitCode = 1; });
