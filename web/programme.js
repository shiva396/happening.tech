(() => {
  const cards = document.querySelectorAll("[data-end]");
  for (const card of cards) {
    if (Date.parse(card.dataset.end) <= Date.now()) {
      const link = card.querySelector("[data-host-url]");
      link.href = link.dataset.hostUrl;
      link.querySelector("span").textContent = "Visit event archive";
    }
  }

  for (const line of document.querySelectorAll("[data-local-start]")) {
    const start = new Date(line.dataset.localStart);
    const end = new Date(line.dataset.localEnd);
    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    };
    const local = new Intl.DateTimeFormat(undefined, options);
    const hostTime = line.textContent;
    line.textContent = local.formatRange(start, end).replace(/\s*[–—]\s*/u, " to ") + " your time";
    const host = document.createElement("span");
    host.textContent = "Starts " + hostTime + " at the event";
    line.after(host);
  }

  const directory = document.querySelector("[data-directory]");
  if (!directory) return;
  const query = document.getElementById("query");
  const city = document.getElementById("city");
  const topic = document.getElementById("topic");
  const rows = [...directory.querySelectorAll("[data-slug]")];
  const panels = [...directory.querySelectorAll("[data-panel]")];
  const groups = [...directory.querySelectorAll(".month-group")];
  const country = document.getElementById("country");
  const prev = document.getElementById("country-prev");
  const next = document.getElementById("country-next");
  const clear = document.getElementById("reset");
  const count = document.getElementById("count");
  let selected;
  let previousSelection;

  function readLocation() {
    const isPast = directory.dataset.directory === "past";
    const available = rows.filter(row => (Date.parse(row.dataset.expires) <= Date.now()) === isPast);
    const params = new URLSearchParams(location.search);
    query.value = params.get("q") || "";
    if (country) {
      const linked = available.find(row => row.dataset.slug === params.get("event") || row.dataset.city === params.get("city"));
      const name = params.get("country") ?? linked?.dataset.country ?? "India";
      country.value = [...country.options].some(option => option.value === name) ? name : "India";
    }
    for (const field of [city, topic]) {
      const values = new Set(available.filter(row => !country?.value || row.dataset.country === country.value).map(row => row.dataset[field.id]));
      for (const option of field.options) {
        option.hidden = Boolean(option.value) && !values.has(option.value);
      }
      const requested = params.get(field.id);
      field.value = [...field.options].some(
        (option) => !option.hidden && option.value === requested,
      )
        ? requested
        : "";
    }
    selected = params.get("event");
    render();
  }

  function saveLocation() {
    const url = new URL(location.href);
    for (const [key, value] of [
      ["q", query.value],
      ["city", city.value],
      ["topic", topic.value],
      ["event", selected],
    ]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (country) url.searchParams.set("country", country.value);
    history.replaceState(null, "", url);
  }

  function render() {
    const phrase = query.value.trim().toLowerCase();
    const shown = rows.filter((row) => {
      const match =
        (Date.parse(row.dataset.expires) <= Date.now()) === (directory.dataset.directory === "past") &&
        (!country?.value || country.value === row.dataset.country) &&
        (!city.value || city.value === row.dataset.city) &&
        (!topic.value || topic.value === row.dataset.topic) &&
        (row.textContent + " " + row.dataset.host)
          .toLowerCase()
          .includes(phrase);
      row.hidden = !match;
      return match;
    });
    selected =
      shown.find((row) => row.dataset.slug === selected)?.dataset.slug ||
      shown[0]?.dataset.slug ||
      "";
    for (const row of rows) {
      const active = row.dataset.slug === selected;
      row.dataset.selected = String(active);
      if (active) row.setAttribute("aria-current", "true");
      else row.removeAttribute("aria-current");
    }
    for (const group of groups)
      group.hidden = !group.querySelector(".event-row:not([hidden])");
    for (const panel of panels) {
      const active = panel.dataset.panel === selected;
      if (active && selected !== previousSelection) {
        panel.toggleAttribute("data-reveal", previousSelection !== undefined);
      }
      panel.hidden = !active;
    }
    if (previousSelection !== undefined && selected && selected !== previousSelection) {
      directory.querySelector('[data-motion="ticket"]').dispatchEvent(new Event("play-motion", { bubbles: true }));
    }
    previousSelection = selected;
    if (country) {
      document.getElementById("country-title").textContent = country.value === "Online" ? "Online events" :
        country.value ? "Events in " + (["United States", "United Kingdom", "United Arab Emirates", "Netherlands", "Philippines", "Bahamas", "Maldives", "Seychelles"].includes(country.value) ? "the " : "") + country.value : "Events worldwide";
      document.getElementById("country-empty").hidden = shown.length > 0;
      directory.querySelector("[data-detail-heading]").hidden = shown.length === 0;
      const index = shown.findIndex(row => row.dataset.slug === selected);
      document.getElementById("country-paging").textContent = shown.length > 1 ? (index + 1) + " of " + shown.length : "";
      prev.hidden = next.hidden = shown.length < 2;
      const cities = new Set(rows.filter(row => (!country.value || row.dataset.country === country.value) &&
        Date.parse(row.dataset.expires) > Date.now()).map(row => row.dataset.city));
      directory.querySelector(".filters").hidden = cities.size === 0;
      directory.querySelector(".event-list").hidden = cities.size === 0;
      document.querySelector("#country-empty h3").textContent = cities.size ? "No matching events" : "No upcoming events here";
      document.querySelector("#country-empty p").textContent = cities.size ? "Try a different search, location, or topic." : "Know a gathering here? Share it with the community.";
      for (const option of city.options) option.hidden = !!option.value && !cities.has(option.value);
    }
    const feature = directory.querySelector("[data-feature]");
    if (feature)
      feature.hidden =
        Boolean(query.value || city.value || topic.value) ||
        !shown.some((row) => row.dataset.slug === feature.dataset.feature);
    const nextCount = shown.length + (shown.length === 1 ? " event" : " events");
    if (count.textContent !== nextCount) {
      count.replaceChildren(Object.assign(document.createElement("span"), { textContent: nextCount }));
    }
    document.getElementById("empty").hidden = shown.length > 0 || Boolean(country);
    directory.querySelector(".spotlight").hidden = !country && shown.length === 0;
    clear.hidden = !query.value && !city.value && !topic.value;
  }

  function filter() {
    render();
    saveLocation();
  }
  query.addEventListener("input", filter);
  for (const field of [city, topic]) field.addEventListener("change", filter);
  if (country) {
    country.addEventListener("change", () => {
      query.value = city.value = topic.value = "";
      selected = "";
      filter();
    });
    function step(direction) {
      const shown = rows.filter(row => !row.hidden);
      if (!shown.length) return;
      directory.querySelector("[data-detail-heading]").hidden = shown.length === 0;
      const index = shown.findIndex(row => row.dataset.slug === selected);
      selected = shown[(index + direction + shown.length) % shown.length].dataset.slug;
      filter();
    }
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));
  }
  clear.addEventListener("click", () => {
    query.value = city.value = topic.value = "";
    filter();
    query.focus();
  });
  for (const row of rows)
    row.addEventListener("click", (event) => {
      if (
        !directory.querySelector(".spotlight").getClientRects().length ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      selected = row.dataset.slug;
      render();
      saveLocation();
      if (country) {
        const details = directory.querySelector(".spotlight");
        if (event.detail === 0) {
          details.tabIndex = -1;
          details.focus({ preventScroll: true });
        }
        details.scrollIntoView({block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
      }
    });
  window.addEventListener("pageshow", readLocation);
  readLocation();
})();
