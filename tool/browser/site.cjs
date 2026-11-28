const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { execFileSync } = require("node:child_process");
const { eachBrowser, preview } = require("./browser.cjs");

const root = new URL(preview);
const url = (path) => new URL(path, root).href;

async function atlas(page) {
  await page.goto(root.href);
  const data = await page.locator("#atlas-data").evaluate((node) => JSON.parse(node.textContent));
  assert.equal(await page.locator("[data-directory-id]").count(), 0, "The unopened directory stays out of the globe DOM");
  const cards = page.locator(".event-card:visible");
  const expectedOrder = (past) =>
    data.events
      .filter((e) => Date.parse(e.end) <= Date.now() === past)
      .sort(
        (left, right) =>
          (past ? -1 : 1) * (Date.parse(left.start) - Date.parse(right.start) || left.id.localeCompare(right.id)),
      )
      .map((e) => e.id);
  const visibleOrder = () => cards.evaluateAll((elements) => elements.map((el) => el.dataset.event));
  await page.locator('.world-frame[data-view="world"]').waitFor();
  const gesture = await page.locator('.atlas-earth[data-rendered="true"]').evaluate(async earth => {
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const diameter = () => parseFloat(getComputedStyle(earth).getPropertyValue("--hit-size"));
    const box = earth.getBoundingClientRect();
    function send(type, scale) {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { scale, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 });
      earth.dispatchEvent(e);
    }
    const initial = diameter();
    send("gesturestart", 1);
    send("gesturechange", 1.5);
    await frame();
    const spread = diameter() / initial;
    send("gesturechange", 1);
    send("gestureend", 1);
    await frame();
    return { spread, restored: Math.abs(initial - diameter()) <= 1 };
  });
  assert(gesture.spread > 2.1 && gesture.spread < 2.2 && gesture.restored);
  assert.equal(await cards.count(), 0);
  assert(await page.locator(".globe-pages").isHidden());
  assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
  await page.getByRole("link", { name: "Program view", exact: true }).click();
  assert.deepEqual(await visibleOrder(), expectedOrder(false));
  const homeCount = await cards.count();
  const event = data.events.find((e) => e.latitude != null && e.kind === "event");
  assert(event);
  assert(await page.locator("[data-camera=motion]").isDisabled());
  await page.getByRole("link", { name: "Program view", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search events" }).fill("no_result_anywhere");
  assert(await page.locator("#event-empty").isVisible());
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  assert.equal(await cards.count(), homeCount);
  await page.locator('[data-period="past"]').click();
  assert.deepEqual(await visibleOrder(), expectedOrder(true));
  const pastCount = await cards.count();
  assert.equal(homeCount + pastCount, data.events.length);
  const chosenPeriod = Date.parse(event.end) <= Date.now() ? "past" : "upcoming";
  await page.locator('[data-period="' + chosenPeriod + '"]').click();
  await page.locator('[data-on-map="' + event.id + '"]').click();
  const selected = new URL(page.url());
  assert.equal(selected.searchParams.get("event"), event.id);
  assert.equal(selected.hash, "#world");
  await page.locator("#world-preview h3").filter({ hasText: event.title }).waitFor();
  await page.getByRole("link", { name: "Program view", exact: true }).click();
  assert(await page.locator('[data-event="' + event.id + '"]').isVisible());
  await page.goBack();
  assert.equal(new URL(page.url()).hash, "#world");
  await page.getByRole("button", { name: "Close place preview" }).click();
  await page.keyboard.press("/");
  await page.getByRole("searchbox", { name: "Find a city, country or community" }).fill("Chennai");
  await page.getByRole("button", { name: "Chennai India" }).click();
  assert.equal(new URL(page.url()).searchParams.get("city"), "Chennai");
  await page.getByRole("heading", { name: "Chennai", exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, "#place");
  const surface = await page.locator(".atlas-earth").elementHandle();
  await page.locator("#place .local-entry").filter({ hasText: "Namma Flutter" }).first().click();
  await page.locator("#globe-story article").waitFor();
  assert.equal(await page.evaluate((el) => el === document.querySelector(".atlas-earth"), surface), true);
  await page.goBack();
  await page.getByRole("heading", { name: "Chennai", exact: true }).waitFor();
  await page.locator("#place .place-chip").filter({ hasText: "India" }).click();
  await page.getByRole("heading", { name: "India", exact: true }).waitFor();
  await page.getByRole("link", { name: "Program view", exact: true }).click();
  await page.getByRole("button", { name: "Clear active filters" }).click();
  await page.locator("[data-period=past]").click();
  await page.locator("[data-filter=country]").selectOption(event.country);
  await page.locator(".extra-filters summary").click();
  await page.locator("[data-filter=city]").selectOption(event.city);
  await page.locator("[data-filter=from]").fill("2010-01-01");
  assert((await cards.allTextContents()).every((text) => text.includes(event.city)));
  await page.locator(".world-dock [data-view=communities]").click();
  await page.getByRole("searchbox", { name: "Search communities" }).fill("namma");
  await page.locator(".world-frame .community-card:visible h3 a").click();
  await page.locator("#globe-story h1").filter({ hasText: "Namma Flutter" }).waitFor();
  await page.reload();
  await page.locator("#globe-story h1").filter({ hasText: "Namma Flutter" }).waitFor();
  await page.locator(".world-dock [data-view=activity]").click();
  await page.locator("#activity .timeline a").first().click();
  await page.locator("#globe-story .detail-facts").waitFor();
  await page.locator(".atlas-info summary").click();
  await page.locator(".info-page").getByRole("link", { name: "List an event" }).click();
  await page.locator("#submit [name=title]").fill("Unfinished local listing");
  await page.locator(".world-dock [data-view=world]").click();
  await page.goBack();
  assert.equal(await page.locator("#submit [name=title]").inputValue(), "Unfinished local listing");
  await page.locator(".atlas-info summary").click();
  await page.locator(".info-page").getByRole("link", { name: "Notifications" }).click();
  await page.locator("#notifications #push-status").waitFor();
  assert.equal(new URL(page.url()).pathname, root.pathname);
  await page.goto(url("archive/"));
  await page.locator(".split-heading [data-view=world]").click();
  assert.equal(new URL(page.url()).searchParams.get("period"), "past");
  await page.goto(url("communities/"));
  const directorySearch = page.getByRole("searchbox", { name: "Search communities" });
  const community = page.locator(".community-card:visible");
  await directorySearch.fill("Nairobi");
  assert.equal(await community.count(), 1);
  assert.equal(await community.getByRole("link").textContent(), "Flutter Nairobi");
  const groupImage = community.locator("img");
  await groupImage.scrollIntoViewIfNeeded();
  await page.waitForFunction(image => image.complete && image.naturalWidth > 0, await groupImage.elementHandle());
  await community.getByRole("link").click();
  await page.getByRole("heading", { name: "Flutter Nairobi", exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Official community site" }).getAttribute("href"),
    "https://www.meetup.com/flutter_nairobi/");
  await page.goBack();
  await directorySearch.fill("namma");
  assert.equal(await community.count(), 1);
  await community.getByRole("link").click();
  assert(await page.getByRole("heading", { name: "Namma Flutter", exact: true }).isVisible());
  await page.getByRole("link", { name: "Find on globe" }).click();
  await page.locator("#world-preview h3").filter({ hasText: "Namma Flutter" }).waitFor();
  await page.goto(url("events/" + event.id + "/"));
  assert(await page.locator(".permalink.inside .globe-pages article h1").isVisible());
  assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  assert.equal(schema.name, event.title);
  assert(
    (await page.getByRole("link", { name: "Add to calendar" }).getAttribute("href")).startsWith(
      "data:text/calendar",
    ),
  );
  await page.locator(".permalink .world-tools").getByRole("link", { name: "Find a place" }).click();
  await page.getByRole("searchbox", { name: "Find a city, country or community" }).waitFor();
}

async function listing(page) {
  await page.goto(new URL("submit/", root).href);
  await page.locator("#entry-submit").click();
  const field = (name) => page.locator('#entry-form [name="' + name + '"]');
  assert.equal(await field("title").getAttribute("aria-invalid"), "true");
  assert(await page.locator("#entry-field-error").isVisible());
  for (const [name, value] of Object.entries({
    title: "Chennai Flutter Night",
    description: "Build a Jaspr page together.",
    start_date: "2030-11-20",
    timezone: "Asia/Kolkata",
    url: "https://example.org/meet",
    registration_url: "https://example.org/tickets",
  })) {
    await field(name).fill(value);
  }
  await field("community_id").selectOption("namma-flutter");
  const submit = page.locator("#entry-submit");
  async function rejected(name, hint) {
    await submit.click();
    assert.equal(await field(name).getAttribute("aria-invalid"), "true");
    assert(await field(name).evaluate((node) => node === document.activeElement));
    assert.match(await page.locator("#entry-field-error").innerText(), hint);
    assert(await page.locator("#entry-output").isHidden());
  }
  await rejected("city", /city/i);
  await field("attendance").selectOption("Online");
  for (const [name, invalid, valid, hint] of [
    ["end_date", "2030-11-19", "", /last day/i],
    ["url", "ftp://example.org/event", "https://example.org/meet", /HTTP/i],
    ["registration_url", "https://test@example.org/tickets", "https://example.org/tickets", /credentials/i],
    ["timezone", "Chennai/Unknown", "America/New_York", /time zone/i],
  ]) {
    await field(name).fill(invalid);
    await rejected(name, hint);
    await field(name).fill(valid);
  }
  await page.getByText("Add start and end times", { exact: true }).click();
  await field("start_time").fill("02:30");
  await rejected("end_time", /end time/i);
  await field("end_time").fill("03:30");
  // New York skips 02:30 in March and repeats 01:30 in November.
  for (const [day, clock] of [
    ["2025-03-09", "02:30"],
    ["2025-11-02", "01:30"],
  ]) {
    await field("start_date").fill(day);
    await field("start_time").fill(clock);
    await rejected("start_time", /clock changes/i);
  }
  await field("start_date").fill("2030-11-20");
  await field("start_time").fill("20:00");
  await rejected("end_time", /end after the start/i);
  await field("end_date").fill("2030-11-21");
  assert(await field("venue").isDisabled());
  assert.equal(await page.locator("#entry-preview-title").innerText(), "Chennai Flutter Night");
  await page.locator("#entry-submit").click();
  await page.locator("#entry-output").waitFor();
  const contents = await page.locator("#entry-download").evaluate(async (node) => (await fetch(node.href)).text());
  assert.match(contents, /title = "Chennai Flutter Night"/);
  assert(contents.includes('start = "2030-11-21T01:00:00.000Z"'));
  assert(contents.includes('end = "2030-11-21T08:30:00.000Z"'));
  assert.match(contents, /registration_url = "https:\/\/example.org\/tickets"/);
  const repo = await page.locator("#entry-studio").getAttribute("data-repository");
  if (repo) {
    const url = new URL(await page.locator("#entry-github").getAttribute("href"));
    assert.equal(url.origin + url.pathname, "https://github.com/" + repo + "/new/main");
    assert.equal(url.searchParams.get("value"), contents);
    assert.match(url.searchParams.get("filename"), /^events\/.+\.toml$/);
  }
  assert.match(contents, /community_id = "namma-flutter"/);
  assert.doesNotMatch(contents, /^(city|country|venue|latitude|longitude) =/m);
  const fixtures = mkdtempSync(join(tmpdir(), "flutter-spot-form-"));
  try {
    writeFileSync(join(fixtures, "online.toml"), contents);
    await field("title").fill("Chennai hybrid workshop");
    await field("url").fill("https://example.org/workshop");
    await field("registration_url").fill("");
    await field("attendance").selectOption("Hybrid");
    await field("category").selectOption("Workshop");
    await field("city").fill("Chennai");
    await field("country").fill("India");
    await field("latitude").fill("13.08");
    await rejected("longitude", /both coordinates/);
    await field("longitude").fill("80.27");
    await submit.click();
    await page.locator("#entry-output").waitFor();
    const download = page.waitForEvent("download");
    await page.locator("#entry-download").click();
    await (await download).saveAs(join(fixtures, "hybrid.toml"));
    execFileSync("dart", ["run", "tool/validate.dart", fixtures], { cwd: resolve(__dirname, "../..") });
  } finally {
    rmSync(fixtures, { recursive: true, force: true });
  }
  await field("title").fill("Changed the title");
  assert(await page.locator("#entry-output").isHidden());
}

eachBrowser(async (browser, name) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(root.href) && r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  await atlas(page);
  await listing(page);
  for (const path of [
    "",
    "archive/",
    "communities/",
    "submit/",
    "events/fluttercon-berlin-2027/",
    "notifications/",
  ]) {
    await page.goto(url(path));
    for (const width of [320, 390, 700, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      });
      const excess = await page.evaluate(() =>
        document.documentElement.scrollWidth > innerWidth + 1
          ? [...document.body.querySelectorAll("*")]
              .filter((n) => n.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 6)
              .map((n) => n.tagName + "." + n.className)
              .join(", ") || "document overflow"
          : "",
      );
      assert.equal(excess, "", path + " at " + width + "px: " + excess);
    }
  }
  await page.close();
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(root.href);
  assert(await staticPage.locator(".atlas-earth-poster").isVisible());
  await staticPage.getByRole("link", { name: "Communities", exact: true }).click();
  assert(await staticPage.getByRole("link", { name: "Flutter Nairobi", exact: true }).isVisible());
  await staticPage.goBack();
  assert(await staticPage.locator("#program .filter-bar").isHidden());
  await staticPage.locator("[data-period=past]").click();
  assert.equal(
    await staticPage.locator(".event-card:visible").count(),
    Number((await staticPage.locator("#program-count").innerText()).split(" ")[0]),
  );
  await staticPage.locator(".event-card:visible h3 a").first().click();
  assert(await staticPage.getByRole("link", { name: "Add to calendar" }).isVisible());
  assert.deepEqual(errors, []);
  console.log(name + " passed discovery, history, directory, form downloads, responsive and static routes.");
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
