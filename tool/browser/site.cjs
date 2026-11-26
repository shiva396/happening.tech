const assert = require("node:assert/strict");
const { eachBrowser, preview } = require("./browser.cjs");

const widths = [320, 390, 600, 740, 741, 768, 1024, 1440, 1820, 2560];
const root = new URL(preview.endsWith("/") ? preview : preview + "/");

async function layout(page, url) {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const issue = await page.evaluate(() => {
      const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
        return "page overflows";
      const theme = box("#theme-switch"),
        action = box(".mast-actions .list-event");
      if (
        action.left - theme.right < -1 ||
        action.left - theme.right > 7 ||
        Math.abs(theme.y + theme.height / 2 - action.y - action.height / 2) > 1
      )
        return "header actions misaligned";
      const globe = box(".country-atlas");
      if (globe) {
        const results = box(".country-programme"),
          list = box(".country-list"),
          detail = box(".spotlight");
        if (globe.bottom > results.top + 1 || Math.abs(globe.width - results.width) > 1)
          return "globe and results misaligned";
        if (
          list.width &&
          (matchMedia("(max-width: 740px)").matches
            ? list.bottom > detail.top + 1
            : list.right > detail.left + 1 || Math.abs(list.top - detail.top) > 1)
        )
          return "country list and detail overlap";
      }
      return null;
    });
    assert.equal(issue, null, url + " at " + width + "px: " + issue);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function eventListLayout(page) {
  await page.evaluate(() => document.fonts.ready);
  const layouts = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    layouts.push(await page.locator(".event-list").evaluate((list) => {
      const origin = list.getBoundingClientRect();
      // Compare positions within the list, independent of the globe or filters above it.
      const parts = list.querySelectorAll(".section-head, .section-head > *, .month, .event-row, .event-row > *, .row-info > *");
      return Array.from(parts).filter((part) => part.getClientRects().length).map((part) => {
        const rect = part.getBoundingClientRect();
        return { text: part.textContent.trim().replace(/\s+/g, " "), box: [rect.x - origin.x, rect.y - origin.y, rect.width, rect.height] };
      });
    }));
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  return layouts;
}

async function programme(page) {
  await page.goto(root.href);
  const theme = page.locator("#theme-switch");
  await theme.click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await theme.click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  const sizes = await page.addStyleTag({
    content: `:root {
      --control-height: 54px;
      --control-height-compact: 52px;
      --list-button-padding: 6px 23px;
      --list-button-height-mobile: 49px;
      --list-button-padding-mobile: 4px 11px;
    }`,
  });
  const action = page.locator(".mast-actions .list-event");
  for (const [width, height, padding] of [[1280, "52px", "23px"], [390, "49px", "11px"]]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(await theme.evaluate((el) => getComputedStyle(el).height), "54px");
    assert.deepEqual(await action.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.minHeight, style.paddingInlineStart];
    }), [height, padding]);
  }
  await sizes.evaluate((el) => el.remove());
  await page.setViewportSize({ width: 1280, height: 800 });
  const rows = page.locator(".event-row:visible");
  const count = await rows.count();
  await page.locator("#query").fill("zz-no-such-gathering");
  assert.equal(await rows.count(), 0);
  assert(await page.locator("#empty").isVisible());
  await page.locator("#reset").click();
  assert.equal(await rows.count(), count);
  if (count) {
    for (const key of ["topic", "city"]) {
      const value = await rows.first().getAttribute("data-" + key);
      await page.locator("#" + key).selectOption(value);
      assert(
        (await rows.evaluateAll((nodes, k) => nodes.map((el) => el.dataset[k]), key)).every((v) => v === value),
      );
      await page.locator("#" + key).selectOption("");
    }
    const row = rows.last();
    await row.click();
    assert.equal(
      await page.locator(".selected-panel:visible").getAttribute("data-panel"),
      await row.getAttribute("data-slug"),
    );
  }
  const day = page.locator("#activity-grid button").first();
  if (await day.count()) {
    await day.hover();
    await page.locator("#activity-preview a").first().waitFor();
    await page.mouse.move(0, 0);
    await page.locator("#activity-preview").waitFor({ state: "hidden" });
  }
  await page.locator(".archive-link").click();
  assert.equal(await page.locator("[data-directory]").getAttribute("data-directory"), "past");
  // The static archive contains every listing, including future entries hidden by the browser.
  const href = await page.locator(".event-row").first().getAttribute("href");
  return new URL(href, root).href;
}

async function world(page) {
  await page.goto(new URL("world/", root).href);
  await page.locator("#country-globe").waitFor();
  assert.equal(await page.locator("#activity").count(), 0);
  // Change the design tokens at runtime to check that HTML and SVG consume the same theme.
  const overrides = await page.addStyleTag({
    content: ":root { --accent: rgb(16, 80, 128); --weight-heading: 440; --globe-label: rgb(33, 66, 99); --globe-control-size: 51px; }",
  });
  assert.equal(
    await page.locator(".mast-actions .list-event").evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(16, 80, 128)",
  );
  assert.equal(await page.locator("h1").evaluate((el) => getComputedStyle(el).fontWeight), "440");
  assert.deepEqual(await page.locator(".globe-controls button").first().evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.width, style.height];
  }), ["51px", "51px"]);
  const label = page.locator(".globe-name:not(.is-selected)").first();
  assert.deepEqual(await label.evaluate((el) => [getComputedStyle(el).fill, getComputedStyle(el).fontWeight]), [
    "rgb(33, 66, 99)",
    "440",
  ]);
  await overrides.evaluate((el) => el.remove());
  const country = page.locator("#country");
  const empty = await country
    .locator('optgroup[label="Other countries and territories"] option')
    .first()
    .getAttribute("value");
  await country.selectOption(empty);
  assert((await page.locator("#country-title").innerText()).includes(empty));
  assert(await page.locator("#country-empty .list-event").isVisible());
  await page.reload();
  assert.equal(await country.inputValue(), empty);
  await country.selectOption("");
  const events = page.locator(".event-row:visible");
  if ((await events.count()) > 1) {
    await page.locator("#country-next").click();
    assert.equal(
      await page.locator(".selected-panel:visible").getAttribute("data-panel"),
      await events.nth(1).getAttribute("data-slug"),
    );
  }
  for (const mode of ["satellite", "terrain"]) {
    await page.locator('[data-map-style="' + mode + '"]').click();
    await page.waitForFunction(
      (mode) => document.querySelector(".satellite-surface").hidden === (mode === "terrain"),
      mode,
    );
  }
  const ring = page.locator(".globe-focus");
  const initial = Number(await ring.getAttribute("r"));
  const globe = page.locator("#country-globe");
  await globe.scrollIntoViewIfNeeded();
  // A plain wheel is also how desktop browsers deliver a two-finger trackpad scroll.
  const stage = await globe.boundingBox();
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
  const beforeScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 100);
  await page.waitForFunction((y) => scrollY > y, beforeScroll);
  assert.equal(Number(await ring.getAttribute("r")), initial);
  await globe.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  for (const delta of [-75, 75]) {
    const before = Number(await ring.getAttribute("r"));
    const canceled = await globe.evaluate(
      (node, deltaY) =>
        !node.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          }),
        ),
      delta,
    );
    assert(canceled);
    await page.waitForFunction(
      ({ before, delta }) => {
        const radius = Number(document.querySelector(".globe-focus").getAttribute("r"));
        return delta < 0 ? radius > before : radius < before;
      },
      { before, delta },
    );
  }
  assert(Math.abs(Number(await ring.getAttribute("r")) - initial) < 1);
  assert.equal(await page.evaluate(() => scrollY), scroll);
  return new URL("world/?country=" + encodeURIComponent(empty), root).href;
}

async function listing(page) {
  await page.goto(new URL("submit/", root).href);
  await page.locator("#entry-submit").click();
  const field = (name) => page.locator('#entry-form [name="' + name + '"]');
  assert.equal(await field("title").getAttribute("aria-invalid"), "true");
  assert(await page.locator("#entry-field-error").isVisible());
  for (const [name, value] of Object.entries({
    title: "Chennai Web Night",
    community: "Chennai Web",
    topic: "Dart",
    description: "Build a Jaspr page together.",
    start_date: "2030-11-20",
    timezone: "Asia/Kolkata",
    url: "https://example.org/meet",
    registration_url: "https://example.org/tickets",
  })) {
    await field(name).fill(value);
  }
  const submit = page.locator("#entry-submit");
  async function rejected(name, hint) {
    await submit.click();
    assert.equal(await field(name).getAttribute("aria-invalid"), "true");
    assert(await field(name).evaluate((node) => node === document.activeElement));
    assert.match(await page.locator("#entry-field-error").innerText(), hint);
    assert(await page.locator("#entry-output").isHidden());
  }
  await rejected("city", /city/i);
  await field("online").check();
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
  assert.equal(await page.locator("#entry-preview-title").innerText(), "Chennai Web Night");
  await page.locator("#entry-submit").click();
  await page.locator("#entry-output").waitFor();
  const contents = await page
    .locator("#entry-download")
    .evaluate(async (node) => (await fetch(node.href)).text());
  assert.match(contents, /title = "Chennai Web Night"/);
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
  await field("title").fill("Changed the title");
  assert(await page.locator("#entry-output").isHidden());
}

eachBrowser(async (browser, name) => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.url().startsWith(root.href) && response.status() >= 400)
      errors.push(response.status() + " " + response.url());
  });
  const eventUrl = await programme(page);
  const emptyUrl = await world(page);
  await listing(page);
  const routes = [
    root.href,
    new URL("past/", root).href,
    eventUrl,
    new URL("world/?country=", root).href,
    emptyUrl,
    new URL("submit/", root).href,
  ];
  for (const url of routes) await layout(page, url);
  await page.goto(root.href);
  const programmeList = await eventListLayout(page);
  await page.goto(new URL("world/?country=", root).href);
  const worldList = await eventListLayout(page);
  // World view replaces the list with a country invitation when no upcoming events exist.
  if (await page.locator(".event-list").isVisible()) {
    for (const [index, width] of widths.entries()) {
      const expected = worldList[index];
      const actual = programmeList[index];
      assert.equal(actual.length, expected.length, "Visible event list parts at " + width + "px");
      for (const [i, part] of actual.entries()) {
        assert.equal(part.text, expected[i].text);
        // Document offsets can introduce fractional-pixel differences between the two grids.
        assert(part.box.every((value, axis) => Math.abs(value - expected[i].box[axis]) < 0.1),
          `Event list at ${width}px, "${part.text}": ${part.box} vs ${expected[i].box}`);
      }
    }
  }
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(eventUrl);
  assert(await staticPage.locator("h1").isVisible());
  assert.match(await staticPage.locator(".primary-action").getAttribute("href"), /^https?:\/\//);
  assert.match(await staticPage.locator(".calendar-action").getAttribute("href"), /^data:text\/calendar/);
  assert.deepEqual(errors, []);
  console.log(
    name + " passed flows, static event page, and " + routes.length * widths.length + " layout checks.",
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
