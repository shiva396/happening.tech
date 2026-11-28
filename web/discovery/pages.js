import { renderPlace } from "./place.js";
// The globe keeps its camera and selection while visitors read a page inside it.
// Permanent detail links still open the same server-rendered article on their own.
export function mountGlobePages(frame, state, catalog) {
  const surface = frame.querySelector(".world-scene");
  const deck = frame.querySelector(".globe-pages");
  const story = deck.querySelector("#globe-story");
  const links = [...frame.querySelectorAll(".world-dock [data-view]")];
  const utilities = {
    submit: { title: "List an event", selector: "#entry-studio" },
    notifications: { title: "Notifications", selector: ".wrap" },
  };
  const views = ["program", "communities", "activity", "place", ...Object.keys(utilities)];
  const records = new Map(
    catalog.map((record) => [(record.kind === "event" ? "events/" : "communities/") + record.id, record]),
  );
  const scrollPositions = new Map();
  const homeTitle = document.title;
  let active, request, lastPlace;

  function headingFocus(container) {
    const heading = container?.querySelector("h1,h2");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  async function readPage(path, focus) {
    const utility = utilities[path];
    const target = utility ? deck.querySelector("#" + path) : story;
    if (utility && target.dataset.loaded) {
      if (focus) headingFocus(target);
      return;
    }
    const heading = document.createElement("h2");
    heading.textContent = utility?.title || records.get(path).title;
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = "Opening " + (utility ? "page" : "details") + "…";
    target.replaceChildren(heading, status);
    if (focus) headingFocus(target);
    const controller = new AbortController();
    request = controller;
    const url = new URL(path + "/", document.baseURI);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw Error("Unavailable page");
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const content = doc.querySelector(utility?.selector || "article.detail-page");
      if (!content) throw Error("Missing page content");
      if (controller.signal.aborted) return;
      content.querySelectorAll("script").forEach((script) => script.remove());
      let initialize;
      if (path === "submit") {
        if (!document.querySelector('link[href="submit.css"]')) {
          const style = document.createElement("link");
          style.rel = "stylesheet";
          style.href = "submit.css";
          document.head.append(style);
        }
        const { initSubmit } = await import("../submit.js");
        initialize = () => initSubmit(target.querySelector("#entry-studio"));
      } else if (path === "notifications" && content.querySelector("#push-toggle")) {
        const { initNotifications } = await import("../notifications.js");
        initialize = () => initNotifications(target);
      }
      if (controller.signal.aborted) return;
      const retainedFocus = target.contains(document.activeElement);
      target.replaceChildren(document.importNode(content, true));
      initialize?.();
      if (utility) target.dataset.loaded = "true";
      refreshRegistration(target);
      deck.scrollTop = scrollPositions.get(path) || 0;
      if (retainedFocus) headingFocus(target);
    } catch (error) {
      if (controller.signal.aborted) return;
      status.textContent = "This page could not be loaded. ";
      const link = document.createElement("a");
      link.href = url.href;
      link.dataset.standalone = "";
      link.textContent = "Open the full page";
      status.append(link);
      target.replaceChildren(heading, status);
    }
  }

  function show({ mode, city, country }) {
    refreshRegistration(story);
    const placeKey = mode === "place" ? [country, city].join("|") : "";
    if (mode === active && placeKey === lastPlace) return;
    lastPlace = placeKey;
    const previous = active;
    if (previous) scrollPositions.set(previous, deck.scrollTop);
    request?.abort();
    if (previous) frame.querySelectorAll(".world-top details[open]").forEach((d) => (d.open = false));
    active = mode;
    const reading = mode !== "world";
    const record = records.get(mode);
    const chapter = record ? (record.kind === "event" ? "program" : "communities") : mode;
    frame.dataset.view = mode === "place" ? "place" : chapter;
    frame.classList.toggle("inside", reading);
    surface.inert = reading;
    for (const id of views) deck.querySelector("#" + id).hidden = mode !== id;
    story.hidden = !record;
    deck.hidden = !reading;
    const title = links.find((a) => a.dataset.view === chapter)?.textContent.trim();
    document.title = reading
      ? (record?.title || utilities[mode]?.title || (mode === "place" ? city || country : title)) +
        " · flutter.spot"
      : homeTitle;
    for (const link of links) {
      if (link.dataset.view === (mode === "place" ? "world" : chapter)) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    deck.scrollTop = scrollPositions.get(mode) || 0;
    if (mode === "place") {
      renderPlace(deck.querySelector("#place"), country, city, catalog);
      deck.scrollTop = 0;
      if (previous) headingFocus(deck.querySelector("#place"));
    } else if (record || utilities[mode]) void readPage(mode, Boolean(previous));
    else if (previous && reading) headingFocus(deck.querySelector("#" + mode));
    else if (previous) links[0].focus({ preventScroll: true });
  }

  frame.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    )
      return;
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || link.hasAttribute("data-standalone") || link.target) return;
    const url = new URL(link.href);
    const root = new URL(document.baseURI);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
    const path = url.pathname.slice(root.pathname.length).replace(/\/$/, "");
    let mode;
    if (path === "" && url.hash === "#place" && url.searchParams.has("country")) {
      event.preventDefault();
      state.select({
        kind: "location",
        country: url.searchParams.get("country"),
        city: url.searchParams.get("city") || "",
      });
      return;
    }
    if (records.has(path) || Object.hasOwn(utilities, path)) mode = path;
    else if (path === "communities" && !url.search) mode = "communities";
    else if ((path === "archive" || path === "") && url.hash === "#program") {
      event.preventDefault();
      state.update({ mode: "program", ...(path === "archive" ? { period: "past" } : {}) }, true);
      return;
    } else if (path === "" && url.hash === "#world") {
      const record = records.get(
        url.searchParams.has("event")
          ? "events/" + url.searchParams.get("event")
          : "communities/" + url.searchParams.get("community"),
      );
      if (record) {
        event.preventDefault();
        state.select(record);
        return;
      }
    }
    if (mode) {
      event.preventDefault();
      state.update({ mode }, true);
    }
  });
  for (const event of ["focusin", "click"]) story.addEventListener(event, () => refreshRegistration(story), true);
  return show;
}

export function refreshRegistration(root) {
  const ticket = root.querySelector("[data-registration-until]");
  if (ticket && Date.parse(ticket.dataset.registrationUntil) <= Date.now()) {
    ticket.href = ticket.dataset.organizerUrl;
    ticket.textContent = "Organizer’s event page";
    ticket.removeAttribute("data-registration-until");
  }
}
