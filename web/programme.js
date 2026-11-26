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
  const pins = [...directory.querySelectorAll("[data-pick]")];
  const caption = directory.querySelector(".map-caption");
  const clocks = [...directory.querySelectorAll(".city-clock")].map(element => ({
    element,
    formatter: new Intl.DateTimeFormat(undefined, {
      timeZone: element.dataset.zone, hour: "numeric", minute: "2-digit",
    }),
  }));
  const clear = document.getElementById("reset");
  const count = document.getElementById("count");
  let selected;
  let previousSelection;

  function readLocation() {
    const isPast = directory.dataset.directory === "past";
    const available = rows.filter(row => (Date.parse(row.dataset.expires) <= Date.now()) === isPast);
    const params = new URLSearchParams(location.search);
    query.value = params.get("q") || "";
    for (const field of [city, topic]) {
      const values = new Set(available.map(row => row.dataset[field.id]));
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
    history.replaceState(null, "", url);
  }

  function render() {
    const phrase = query.value.trim().toLowerCase();
    const shown = rows.filter((row) => {
      const match =
        (Date.parse(row.dataset.expires) <= Date.now()) === (directory.dataset.directory === "past") &&
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
    if (caption) {
      const current = shown.find(row => row.dataset.slug === selected);
      for (const pin of pins) {
        const place = pin.dataset.pick;
        pin.setAttribute("aria-pressed", String(city.value === place));
        pin.toggleAttribute("data-highlight", place === current?.dataset.city);
      }
      caption.hidden = !current;
      if (current) {
        const link = document.getElementById("map-event");
        link.href = current.href;
        link.textContent = current.querySelector("h4").textContent;
        document.getElementById("map-host").textContent =
          current.dataset.host + " · " + current.dataset.date;
      }
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
    document.getElementById("empty").hidden = shown.length > 0;
    directory.querySelector(".spotlight").hidden = shown.length === 0;
    clear.hidden = !query.value && !city.value && !topic.value;
  }

  function filter() {
    render();
    saveLocation();
  }
  query.addEventListener("input", filter);
  for (const field of [city, topic]) field.addEventListener("change", filter);
  for (const pin of pins)
    pin.addEventListener("click", () => {
      city.value = city.value === pin.dataset.pick ? "" : pin.dataset.pick;
      filter();
    });
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
    });
  if (clocks.length) {
    let timer;
    function updateLocalTimes() {
      clearTimeout(timer);
      if (document.hidden) return;
      const now = new Date();
      for (const { element, formatter } of clocks) {
        element.textContent = formatter.format(now);
      }
      timer = setTimeout(updateLocalTimes, 60000 - now.getTime() % 60000);
    }
    document.addEventListener("visibilitychange", updateLocalTimes);
    updateLocalTimes();
  }
  window.addEventListener("pageshow", readLocation);
  readLocation();
})();
