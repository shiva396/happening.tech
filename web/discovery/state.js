// The globe and its reading views share URL state. Event expiry uses instants; date filters use host calendar days.
export const filterKeys = ["q", "country", "city", "category", "attendance", "from", "until"];
const keys = [...filterKeys, "lat", "lon", "period", "event", "community"];
export const isPast = (event, now = Date.now()) => Date.parse(event.end) <= now;
const lower = (value) => String(value || "").toLocaleLowerCase();

export function createDiscovery(events, communities, archive) {
  const listeners = new Set();
  const initialPeriod = archive ? "past" : "upcoming";
  const views = new Set([
    "world",
    "program",
    "communities",
    "activity",
    "place",
    "submit",
    "notifications",
    ...events.map((e) => "events/" + e.id),
    ...communities.map((c) => "communities/" + c.id),
  ]);
  function read() {
    const url = new URL(location.href);
    const state = Object.fromEntries(keys.map((k) => [k, url.searchParams.get(k) || ""]));
    const validPoint = (key, limit) => state[key].trim() && Math.abs(Number(state[key])) <= limit;
    if (!state.country || !validPoint("lat", 90) || !validPoint("lon", 180)) {
      state.lat = state.lon = "";
    }
    state.period = ["upcoming", "past"].includes(state.period) ? state.period : initialPeriod;
    const event = events.find((entry) => entry.id === state.event);
    if (event) {
      if (!url.searchParams.has("period")) state.period = isPast(event) ? "past" : "upcoming";
      state.country ||= event.country;
      state.city ||= event.city;
    }
    const hash = url.hash.slice(1);
    state.mode = archive ? "program" : views.has(hash) ? hash : "world";
    if (state.mode === "place" && !state.country) state.mode = "world";
    return state;
  }
  let current = read();
  function publish(next) {
    current = next;
    listeners.forEach((fn) => fn(next));
  }
  function update(patch, push = false) {
    const next = { ...current, ...patch };
    const url = new URL(location.href);
    for (const k of keys) {
      if (!next[k] || (k === "period" && next[k] === initialPeriod)) url.searchParams.delete(k);
      else url.searchParams.set(k, next[k]);
    }
    if ("mode" in patch) url.hash = next.mode;
    if (url.href !== location.href) history[push ? "pushState" : "replaceState"](null, "", url);
    publish(next);
  }
  function matches(e, now) {
    if ((current.period === "past") !== isPast(e, now)) return false;
    if (current.community && current.community !== e.communityId) return false;
    if (["country", "city", "category", "attendance"].some((k) => current[k] && current[k] !== e[k])) return false;
    if ((current.from && e.lastDay < current.from) || (current.until && e.firstDay > current.until)) return false;
    return (
      !current.q ||
      lower([e.title, e.community, e.city, e.country, e.category].join(" ")).includes(lower(current.q).trim())
    );
  }
  const empty = Object.fromEntries([...filterKeys, "lat", "lon", "event", "community"].map((k) => [k, ""]));
  function select(place) {
    const patch = { ...empty, mode: "world" };
    if (place.kind === "event")
      Object.assign(patch, {
        event: place.id,
        period: isPast(place) ? "past" : "upcoming",
        city: place.city,
        country: place.country,
      });
    else if (place.kind === "community") Object.assign(patch, { community: place.id });
    else {
      Object.assign(patch, { country: place.country, city: place.city || "", mode: "place" });
      if (Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) {
        patch.lat = place.latitude.toFixed(3);
        patch.lon = place.longitude.toFixed(3);
      }
    }
    update(patch, true);
  }
  window.addEventListener("popstate", () => publish(read()));
  return {
    get current() {
      return current;
    },
    update,
    select,
    clear: () => update(empty, true),
    subscribe(fn) {
      listeners.add(fn);
      fn(current);
    },
    filtered(now) {
      return events.filter((e) => matches(e, now));
    },
    places(matches, now) {
      const restricted = filterKeys.some((k) => current[k]) || !!current.community;
      const physical = matches
        .filter((e) => e.latitude != null && e.status !== "cancelled")
        .map((e) => {
          const sinceReview = now - Date.parse(e.updated);
          return {
            ...e,
            ongoing: Date.parse(e.start) <= now && !isPast(e, now),
            recent: sinceReview >= 0 && sinceReview < 86400000 && !isPast(e, now),
          };
        });
      const places = [...physical];
      const hosts = new Set(physical.map((e) => e.communityId));
      for (const c of communities) {
        if (c.latitude == null || hosts.has(c.id)) continue;
        if (
          restricted &&
          current.community !== c.id &&
          (current.q ||
            current.category ||
            current.attendance ||
            current.from ||
            current.until ||
            current.community)
        )
          continue;
        if ((current.country && current.country !== c.country) || (current.city && current.city !== c.city))
          continue;
        // An online gathering may carry a photograph explicitly named for the host city.
        const cityImage = "/" + c.city.toLowerCase().replaceAll(" ", "-") + ".webp";
        const photo = events.find(
          (e) => e.communityId === c.id && e.thumbnail && (e.city === c.city || e.thumbnail.endsWith(cityImage)),
        );
        places.push({ ...c, artwork: photo?.artwork || c.artwork, thumbnail: photo?.thumbnail || c.artwork });
      }
      return places;
    },
  };
}
