import { isPast } from "./state.js";

function element(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}

export function placeUrl(country, city = "") {
  const url = new URL("./", document.baseURI);
  url.searchParams.set("country", country);
  if (city) url.searchParams.set("city", city);
  url.hash = "place";
  return url.href;
}

function placeLink(country, city) {
  const link = element("a", city || country, "place-chip");
  link.href = placeUrl(country, city);
  return link;
}

function recordList(label, entries, empty) {
  const section = element("section", null, "local-list");
  section.append(element("h3", label));
  if (!entries.length) section.append(element("p", empty));
  for (const record of entries) {
    const link = element("a", null, "local-entry");
    link.href = new URL(
      (record.kind === "event" ? "events/" : "communities/") + record.id + "/",
      document.baseURI,
    ).href;
    link.append(element("strong", record.title), element("small", record.date || record.city));
    section.append(link);
  }
  return section;
}

export function renderPlace(host, country, city, catalog) {
  const local = catalog.filter((record) => record.country === country && (!city || record.city === city));
  const events = local.filter((record) => record.kind === "event");
  const groups = local.filter((record) => record.kind === "community");
  const upcoming = events.filter((record) => !isPast(record));
  const past = events.filter((record) => isPast(record)).reverse();
  const photo = [...upcoming, ...past].find((record) => record.thumbnail && record.artworkCredit);
  const mast = element("header", null, "place-mast");
  const copy = element("div", null, "place-name");
  if (city) copy.append(placeLink(country, ""));
  copy.append(element("h2", city || country));
  const collections = element("div", null, "place-records");
  if (!city) {
    const cities = [...new Set(local.map((record) => record.city).filter(Boolean))].sort();
    if (cities.length) {
      const citiesNav = element("nav", null, "local-cities");
      citiesNav.setAttribute("aria-label", "Explore cities in " + country);
      for (const name of cities) citiesNav.append(placeLink(country, name));
      copy.append(citiesNav);
    }
  }
  if (photo) {
    const image = element("img");
    image.alt = "";
    image.src = new URL(photo.artwork, document.baseURI).href;
    mast.append(image);
    const credit = element(photo.artworkSource ? "a" : "span", photo.artworkCredit, "local-credit");
    if (photo.artworkSource) credit.href = photo.artworkSource;
    mast.append(credit);
  }
  mast.append(copy);
  collections.append(
    recordList("Upcoming gatherings", upcoming, "No upcoming gatherings are listed here."),
    recordList("Communities", groups, "No local community has been listed yet."),
  );
  if (past.length) collections.append(recordList("Past gatherings", past, ""));
  const contribute = element("a", "List an event", "text-link");
  contribute.href = new URL("submit/", document.baseURI).href;
  collections.append(contribute);
  host.replaceChildren(mast, collections);
}
