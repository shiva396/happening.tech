import { mountTheme } from "./theme.js";
import { placeUrl } from "./place.js";
import { initDirectory, mountGlobePages, refreshRegistration } from "./pages.js";
import { createDiscovery, filterKeys, isPast } from "./state.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const base = (target) => new URL(target, document.baseURI).href;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let motion;
try {
  motion = localStorage.getItem("flutter.spot.motion") !== "off";
} catch {
  motion = true;
}
function animate() {
  return motion && !reduced.matches;
}
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}

function initAtlas({ events, communities }) {
  const stage = $("#atlas .atlas-earth"),
    archive = $("#program").dataset.archive === "true";
  const state = createDiscovery(events, communities, archive);
  const frame = $("#atlas .world-frame");
  const showPage = frame && mountGlobePages(frame, state, [...events, ...communities]);
  const cards = new Map($$("[data-event]").map((el) => [el.dataset.event, el]));
  const eventIndex = new Map(events.map((e) => [e.id, e]));
  const groupIndex = new Map(communities.map((c) => [c.id, c]));
  const preview = $("#world-preview");
  let globe,
    places = [],
    renderedPlaces,
    cameraTarget = null,
    lastSelection = "";
  const filters = $$("[data-filter]"),
    tabs = $$("[data-period]");
  const search = $("#locate"),
    locator = $(".locator");
  const closeLocator = () => {
    if (locator) locator.open = false;
  };

  function go(mode) {
    if (mode === "world" && !stage) {
      const url = new URL("./", document.baseURI);
      url.search = location.search;
      url.searchParams.set("period", state.current.period);
      url.hash = "world";
      location.href = url.href;
      return;
    }
    if (state.current.mode !== mode || location.hash !== "#" + mode) state.update({ mode }, true);
    if (!frame) document.getElementById(mode)?.scrollIntoView({ behavior: animate() ? "smooth" : "instant" });
    closeLocator();
  }
  function focus(place) {
    if (!stage) {
      const params = new URLSearchParams({ [place.kind]: place.id });
      location.href = base("./?" + params + "#world");
      return;
    }
    closeLocator();
    state.select(place);
    if (state.current.mode === "world") {
      go("world");
      preview?.querySelector("h3")?.focus({ preventScroll: true });
    }
  }
  function button(text, action, cls = "pill") {
    const result = node("button", text, cls);
    result.type = "button";
    result.addEventListener("click", action);
    return result;
  }
  function link(text, href, cls) {
    const result = node("a", text, cls);
    result.href = href;
    return result;
  }
  function drawPreview(s, selected) {
    if (!preview) return;
    const canRegister =
      selected?.registration &&
      selected.status !== "cancelled" &&
      !isPast(selected) &&
      (!selected.registrationEnds || Date.parse(selected.registrationEnds) > Date.now());
    const key = [s.event, s.community, s.country, s.city, Boolean(canRegister)].join("|");
    if (lastSelection === key) return;
    lastSelection = key;
    preview.replaceChildren();
    preview.hidden = !selected && !s.country && !s.city;
    if (preview.hidden) return;
    const close = button(
      "×",
      () => {
        state.clear();
        $(".locator summary")?.focus({ preventScroll: true });
      },
      "preview-close",
    );
    close.setAttribute("aria-label", "Close place preview");
    const isEvent = selected?.kind === "event";
    const locality = [s.city, s.country].filter(Boolean).join(", ");
    const title = selected?.title || locality;
    const copy = node("div", null, "preview-copy");
    const heading = node("h3", title);
    heading.tabIndex = -1;
    if (isEvent && canRegister)
      heading.replaceChildren(link(title, base("events/" + selected.id + "/"), "preview-title"));
    copy.append(
      node("small", isEvent ? selected.category : selected ? "Community" : "Location", "field-label"),
      heading,
    );
    if (isEvent) {
      copy.append(node("p", selected.date + " · " + selected.location));
      const actions = node("div", null, "preview-actions");
      actions.append(
        link(
          canRegister ? selected.registrationLabel || "Register" : "Event details",
          canRegister ? selected.registration : base("events/" + selected.id + "/"),
          "text-link",
        ),
        link(selected.community, base("communities/" + selected.communityId + "/"), "text-link"),
      );
      if (selected.country)
        actions.append(
          link(
            "Explore " + (selected.city || selected.country),
            placeUrl(selected.country, selected.city),
            "text-link",
          ),
        );
      copy.append(actions);
    } else {
      if (selected)
        copy.append(
          node("p", selected.description || [selected.city, selected.country].filter(Boolean).join(", ")),
        );
      else {
        const local = (p) => (!s.city || p.city === s.city) && (!s.country || p.country === s.country);
        const groups = communities.filter(local);
        const upcoming = events.filter((e) => local(e) && !isPast(e) && e.status !== "cancelled");
        copy.append(
          node(
            "p",
            upcoming.length +
              " upcoming " +
              (upcoming.length === 1 ? "event" : "events") +
              " · " +
              groups.length +
              " " +
              (groups.length === 1 ? "community" : "communities"),
          ),
        );
        for (const group of groups.slice(0, 3))
          copy.append(link(group.title, base("communities/" + group.id + "/"), "place-group"));
      }
      const actions = node("div", null, "preview-actions");
      actions.append(button("See events", () => go("program"), "text-link"));
      if (selected)
        actions.append(link("Community profile", base("communities/" + selected.id + "/"), "text-link"));
      if (selected?.country || s.country)
        actions.append(
          link(
            "Explore " + (selected?.city || s.city || selected?.country || s.country),
            placeUrl(selected?.country || s.country, selected?.city || s.city),
            "text-link",
          ),
        );
      copy.append(actions);
    }
    if (selected?.artwork) {
      const image = node("img");
      if (!isEvent) image.className = "community-logo";
      image.alt = "";
      image.decoding = "async";
      const picture = node("picture");
      if (selected.thumbnail) {
        const compact = node("source");
        compact.media = "(max-width: 600px), (max-width: 800px) and (orientation: portrait)";
        compact.srcset = base(selected.thumbnail);
        picture.append(compact);
      }
      picture.append(image);
      image.src = base(selected.cardArtwork || selected.artwork);
      preview.append(picture);
    }
    preview.append(copy, close);
  }

  function render(s) {
    showPage?.(s);
    globe?.setReading(s.mode !== "world");
    const now = Date.now();
    const matches = state.filtered(now);
    const ids = new Set(matches.map((e) => e.id));
    for (const [id, el] of cards) {
      el.hidden = !ids.has(id);
      el.classList.toggle("selected-event", id === s.event);
      const title = el.querySelector("h3 a");
      if (id === s.event) title.setAttribute("aria-current", "true");
      else title.removeAttribute("aria-current");
    }
    const grid = $(".event-grid");
    const ordered = s.period === "past" ? [...matches].reverse() : matches;
    if (grid && ordered.some((e, i) => grid.children[i] !== cards.get(e.id))) {
      for (const e of [...ordered].reverse()) grid.prepend(cards.get(e.id));
    }
    for (const field of filters) {
      const value = s[field.dataset.filter];
      if (
        field.tagName === "SELECT" &&
        value &&
        !Array.from(field.options).some((option) => option.value === value)
      ) {
        field.add(new Option(value, value));
      }
      if (field.value !== value) field.value = value;
    }
    for (const tab of tabs) {
      const active = tab.dataset.period === s.period;
      tab.classList.toggle("current", active);
      if (active) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    }
    $("#program-count").textContent = matches.length + " " + (matches.length === 1 ? "event" : "events");
    $("#event-empty").hidden = matches.length > 0;
    $("#clear-active").hidden = !filterKeys.some((k) => s[k]) && !s.community;
    const total = $("#upcoming-total");
    if (total) total.textContent = events.filter((e) => !isPast(e, now) && e.status !== "cancelled").length;
    places = state.places(matches, now);
    const selected = eventIndex.get(s.event) || groupIndex.get(s.community);
    const [collection, storyId] = s.mode.split("/");
    const storyPlace = storyId && (collection === "events" ? eventIndex : groupIndex).get(storyId);
    if (selected?.latitude != null && !places.some((p) => p.id === selected.id)) places.push(selected);
    const signature = places.map((p) => [p.kind, p.id, Boolean(p.ongoing), Boolean(p.recent)].join(":")).join("|");
    if (globe && signature !== renderedPlaces) {
      globe.setPlaces(places);
      renderedPlaces = signature;
    }
    const anchor =
      storyPlace ||
      selected ||
      (s.lat && s.lon && { latitude: Number(s.lat), longitude: Number(s.lon) }) ||
      ((s.city || s.country) &&
        [...places, ...communities, ...events].find(
          (p) => p.latitude != null && (!s.country || p.country === s.country) && (!s.city || p.city === s.city),
        ));
    const targetKey = storyPlace
      ? s.mode
      : selected
        ? [selected.kind, selected.id].join(":")
        : [s.country, s.city, s.lat, s.lon].join(":");
    if (anchor && anchor.latitude != null && cameraTarget !== targetKey && globe) {
      if (storyPlace || selected) globe.focus(storyPlace || selected);
      else globe.flyTo(anchor.latitude, anchor.longitude, s.city ? 2.9 : 1.6);
      cameraTarget = targetKey;
    } else if (!anchor && cameraTarget !== null) {
      globe?.reset();
      cameraTarget = null;
    }
    drawPreview(s, selected);
  }
  state.subscribe(render);
  for (const field of filters) {
    field.addEventListener(field.type === "search" ? "input" : "change", () => {
      const patch = { [field.dataset.filter]: field.value, event: "", community: "" };
      if (["country", "city"].includes(field.dataset.filter)) Object.assign(patch, { lat: "", lon: "" });
      if (field.dataset.filter === "country") {
        patch.city = "";
      }
      state.update(patch);
    });
  }
  for (const el of $$("[data-clear]")) el.addEventListener("click", () => state.clear());
  for (const el of tabs)
    el.addEventListener("click", (e) => {
      e.preventDefault();
      state.update({ period: el.dataset.period, event: "" }, true);
    });
  for (const el of $$("[data-on-map]"))
    el.addEventListener("click", (e) => {
      e.preventDefault();
      focus(eventIndex.get(el.dataset.onMap));
    });
  for (const el of $$("a[data-view]"))
    el.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(el.dataset.view);
    });

  if (search) {
    const list = $("#location-results");
    const options = [],
      seen = new Set();
    for (const place of [...communities, ...events].filter((p) => p.latitude != null)) {
      for (const candidate of [
        { kind: "location", title: place.country, country: place.country, city: "" },
        { kind: "location", title: place.city, city: place.city, country: place.country },
        place,
      ]) {
        const key = [candidate.kind, candidate.title, candidate.country].join("|");
        if (!candidate.title || seen.has(key)) continue;
        seen.add(key);
        options.push(candidate);
      }
    }
    function suggestions() {
      const term = search.value.trim().toLowerCase();
      const result = options
        .filter((p) => [p.title, p.city, p.country].join(" ").toLowerCase().includes(term))
        .slice(0, 8);
      list.replaceChildren(
        ...result.map((place) => {
          const b = button(place.title, () => focus(place), "locator-result");
          b.append(
            node("small", place.kind === "location" ? (place.city ? place.country : "Country") : place.kind),
          );
          return b;
        }),
      );
      if (!result.length) list.append(node("p", "No matching places. Try a country or community name."));
    }
    if (location.hash === "#find") locator.open = true;
    search.addEventListener("input", suggestions);
    locator.addEventListener("toggle", () => {
      if (locator.open) {
        suggestions();
        search.focus({ preventScroll: true });
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const info = $(".atlas-info");
        const extra = $(".extra-filters[open]");
        if (info?.open) {
          info.open = false;
          info.querySelector("summary").focus();
          return;
        }
        if (!locator.open && !extra) {
          if (state.current.mode !== "world") go("world");
          else if (!preview.hidden) preview.querySelector(".preview-close").click();
        }
        if (locator.open) {
          closeLocator();
          locator.querySelector("summary").focus();
        }
        $$(".extra-filters[open]").forEach((x) => (x.open = false));
      }
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
      ) {
        e.preventDefault();
        locator.open = true;
        search.focus();
      }
    });
    document.addEventListener("pointerdown", (e) => {
      for (const d of [locator, $(".atlas-info"), $(".extra-filters")])
        if (d?.open && !d.contains(e.target)) d.open = false;
    });
  }
  function applyMotion() {
    document.documentElement.dataset.motion = animate() ? "on" : "off";
    globe?.setMotion(animate());
    const b = $('[data-camera="motion"]');
    if (b) {
      const label = animate() ? "Pause animations" : "Enable animations";
      b.title = label;
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", String(!animate()));
      b.querySelector("use").setAttribute("href", base("art/icons.svg") + (animate() ? "#pause" : "#play"));
      b.disabled = reduced.matches;
    }
  }
  applyMotion();
  reduced.addEventListener("change", applyMotion);
  if (stage) {
    const start = async () => {
      try {
        const { mountWorld } = await import("../world/world.js");
        globe = await mountWorld(stage, {
          places,
          onSelect: focus,
          onCountry: (country, latitude, longitude) => {
            state.select({ kind: "location", country, latitude, longitude });
          },
          onCamera: ({ latitude, longitude }) => {
            const el = $(".coordinates");
            const label =
              Math.abs(latitude).toFixed(1) +
              "° " +
              (latitude >= 0 ? "N" : "S") +
              "  /  " +
              Math.abs(longitude).toFixed(1) +
              "° " +
              (longitude >= 0 ? "E" : "W");
            if (el.textContent !== label) el.textContent = label;
          },
        });
        render(state.current);
        applyMotion();
      } catch {
        stage.dataset.fallback = "true";
      }
    };
    new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          void start();
        }
      },
      { rootMargin: "300px" },
    ).observe(stage);
    for (const btn of $$("[data-camera]"))
      btn.addEventListener("click", () => {
        switch (btn.dataset.camera) {
          case "in":
            globe?.zoomBy(1.35);
            break;
          case "out":
            globe?.zoomBy(1 / 1.35);
            break;
          case "reset":
            state.clear();
            globe?.reset();
            break;
          case "motion":
            motion = !motion;
            try {
              localStorage.setItem("flutter.spot.motion", motion ? "on" : "off");
            } catch {}
            applyMotion();
            break;
        }
      });
    window.addEventListener("pagehide", (e) => {
      if (!e.persisted) globe?.destroy();
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render(state.current);
  });
  // Long-lived tabs should move a finished event to the archive without a refresh.
  setInterval(() => {
    if (!document.hidden) render(state.current);
  }, 60000);
}

const registration = $("[data-registration-until]");
if (registration) {
  const refresh = () => refreshRegistration(document);
  refresh();
  registration.addEventListener("focus", refresh);
  registration.addEventListener("click", refresh);
  document.addEventListener("visibilitychange", refresh);
  setInterval(refresh, 60000);
}
initDirectory(document);
const data = $("#atlas-data");
if (data) initAtlas(JSON.parse(data.textContent));
const localEarth = $(".permalink .atlas-earth[data-lat]");
if (localEarth) {
  import("../world/world.js").then(async ({ mountWorld }) => {
    const globe = await mountWorld(localEarth);
    globe.setMotion(false);
    globe.setReading(true);
    globe.flyTo(Number(localEarth.dataset.lat), Number(localEarth.dataset.lon), 3.4);
  }).catch(() => {});
}
const frame = $(".world-frame");
if (frame) {
  mountTheme(frame, animate);
  const reader = frame.querySelector(".globe-pages");
  reader.classList.add("awaiting-scrollbar");
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    import("./scrollbar.js").then(({ mountScrollbar }) => mountScrollbar(reader)).catch(() => {
      reader.classList.remove("awaiting-scrollbar");
    });
  }).observe(reader);
}
document.documentElement.classList.add("interactive");
