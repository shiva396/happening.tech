import { CAMERA, clamp, project } from "./camera.js";

const LAYOUT = Object.freeze({
  compactWidth: 480,
  compactLimit: 3,
  limit: 6,
  horizonCutoff: 0.14,
  cardWidth: 112,
  cardHeight: 78,
  compactCardWidth: 79,
  compactCardHeight: 60,
  gap: 10,
  padding: 7,
});

function levelFor(zoom) {
  if (zoom < CAMERA.overviewZoom) return -1;
  if (zoom < CAMERA.countryZoom) return 0;
  if (zoom < CAMERA.regionZoom) return 1;
  if (zoom < CAMERA.cityZoom) return 2;
  return 3;
}

function groupKey(place, level) {
  if (level <= 0) return place.country;
  if (level === 1)
    return [place.country, Math.round(place.latitude / 7), Math.round(place.longitude / 7)].join("|");
  if (level === 2) return [place.city, place.country].join("|");
  return [place.kind, place.id].join("|");
}

function groupsAt(places, level) {
  const groups = new Map();
  for (const place of places) {
    const key = groupKey(place, level);
    const group = groups.get(key) || { key, items: [] };
    group.items.push(place);
    groups.set(key, group);
  }
  let entries = [...groups.values()];
  if (level < 0) {
    // At world scale, nearby national clusters share a single postcard.
    const nearby = [];
    const threshold = Math.cos((14 * Math.PI) / 180);
    for (const group of entries) {
      const anchor = group.items[0];
      const cluster = nearby.find(
        (other) => project(anchor.latitude, anchor.longitude, other.items[0]).z > threshold,
      );
      if (cluster) cluster.items.push(...group.items);
      else nearby.push(group);
    }
    entries = nearby;
  }
  return entries.map((group) => {
    const events = group.items.filter((item) => item.kind === "event");
    const representative = events.find((item) => item.ongoing) || events[0] || group.items[0];
    return { ...group, representative, events };
  });
}

const intersects = (a, b, gap) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
const ns = "http://www.w3.org/2000/svg";

export function makeOverlays(stage, activate) {
  const layer = document.createElement("div");
  layer.className = "world-cards";
  const lines = document.createElementNS(ns, "svg");
  lines.setAttribute("aria-hidden", "true");
  lines.classList.add("world-lines");
  layer.append(lines);
  stage.append(layer);
  let groups = [],
    lastLevel,
    places = [],
    selectedKey = "";
  const shown = new Map();

  function makeCard(group, level) {
    const { representative: place, items, events } = group;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "world-postcard";
    button.dataset.kind = place.kind;
    const count = events.length || items.length;
    const international = items.some((item) => item.country !== place.country);
    const multiCity = items.some((item) => item.city !== place.city);
    let label = place.city || place.country;
    if (level >= 3) label = place.title;
    else if (level <= 0 && multiCity && !international) label = place.country;
    let description = place.title;
    if (items.length > 1) {
      const parts = [];
      if (events.length) parts.push(events.length + " event" + (events.length === 1 ? "" : "s"));
      const communities = items.length - events.length;
      if (communities) parts.push(communities + " communit" + (communities === 1 ? "y" : "ies"));
      description = parts.join(" and ") + (international ? " around " : " in ") + label;
      button.classList.add("world-stack");
    }
    button.setAttribute("aria-label", "Explore " + description);
    button.title = description;
    const picture = document.createElement("span");
    picture.className = "world-photo";
    if (place.artwork) {
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.src = place.thumbnail || place.artwork;
      img.addEventListener("error", () => img.remove(), { once: true });
      picture.append(img);
    }
    const caption = document.createElement("span");
    caption.className = "world-caption";
    caption.textContent = label || place.title;
    button.append(picture, caption);
    if (count > 1) {
      const badge = document.createElement("span");
      badge.className = "world-card-count";
      badge.textContent = String(count);
      button.append(badge);
    }
    button.addEventListener("click", () => activate(group, level));
    const leader = document.createElementNS(ns, "g");
    const line = document.createElementNS(ns, "line");
    const pin = document.createElementNS(ns, "circle");
    pin.setAttribute("r", "3.5");
    leader.classList.add("world-leader");
    if (place.ongoing) leader.classList.add("world-ongoing");
    if (place.recent && !place.ongoing) leader.classList.add("world-recent");
    leader.append(line, pin);
    lines.append(leader);
    layer.append(button);
    return { button, leader, line, pin };
  }

  function remove(key, node) {
    node.button.remove();
    node.leader.remove();
    shown.delete(key);
  }
  return {
    setPlaces(next) {
      places = next.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
      lastLevel = undefined;
      for (const [key, node] of shown) remove(key, node);
    },
    setFocus(place) {
      selectedKey = place ? [place.kind, place.id].join("|") : "";
    },
    draw(camera, width, height, radius) {
      const level = levelFor(camera.zoom);
      if (lastLevel !== level) {
        groups = groupsAt(places, level);
        lastLevel = level;
      }
      const small = width < LAYOUT.compactWidth;
      const w = small ? LAYOUT.compactCardWidth : LAYOUT.cardWidth,
        h = small ? LAYOUT.compactCardHeight : LAYOUT.cardHeight;
      const candidates = [];
      for (const group of groups) {
        const place = group.representative;
        const { x, y, z } = project(place.latitude, place.longitude, camera);
        const ax = width / 2 + x * radius,
          ay = height / 2 - y * radius;
        if (z < LAYOUT.horizonCutoff || ax < 1 || ay < 1 || ax > width - 1 || ay > height - 1) continue;
        const focused = group.items.some((item) => [item.kind, item.id].join("|") === selectedKey);
        const priority = (focused ? 6 : 0) + (place.ongoing ? 3 : 0) + (group.events.length ? 2 : 0) + z;
        candidates.push({ group, ax, ay, focused, priority });
      }
      candidates.sort((a, b) => b.priority - a.priority || a.group.key.localeCompare(b.group.key));
      const boxes = [],
        keep = new Set();
      for (const { group, ax, ay, focused } of candidates) {
        const side = ax >= width / 2 ? 1 : -1;
        const above = ay < height * 0.57 ? -1 : 1;
        const maxShift = Math.min(width * 0.055, 32);
        const align = [
          [side, above, maxShift],
          [side, -above, maxShift],
          [-side, above, maxShift],
          [-side, -above, maxShift],
          [side, above, 0],
          [-side, above, 0],
        ];
        let box;
        for (const [sx, sy, shift] of align) {
          const x = clamp(ax + (sx > 0 ? shift : -w - shift), LAYOUT.padding, width - w - LAYOUT.padding);
          const y = clamp(ay + (sy > 0 ? 13 : -h - 13), LAYOUT.padding, height - h - LAYOUT.padding);
          const proposal = { x, y, w, h };
          if (!boxes.some((other) => intersects(proposal, other, LAYOUT.gap))) {
            box = proposal;
            break;
          }
        }
        if (!box) continue;
        boxes.push(box);
        const key = level + ":" + group.key;
        keep.add(key);
        let card = shown.get(key);
        if (!card) {
          card = makeCard(group, level);
          shown.set(key, card);
        }
        const bx = Math.round(box.x),
          by = Math.round(box.y);
        const cx = clamp(ax, bx + 8, bx + w - 8),
          cy = clamp(ay, by + 5, by + h - 5);
        const coords = [bx, by, Math.round(ax), Math.round(ay), cx, cy].join(",");
        if (card.position !== coords) {
          card.position = coords;
          card.button.style.transform = "translate(" + bx + "px," + by + "px)";
          for (const [k, v] of Object.entries({ x1: ax, y1: ay, x2: cx, y2: cy }))
            card.line.setAttribute(k, v.toFixed(1));
          card.pin.setAttribute("cx", ax.toFixed(1));
          card.pin.setAttribute("cy", ay.toFixed(1));
        }
        card.button.classList.toggle("world-focused", focused);
        if (keep.size >= (small ? LAYOUT.compactLimit : LAYOUT.limit)) break;
      }
      for (const [key, node] of shown) if (!keep.has(key)) remove(key, node);
    },
    dispose() {
      layer.remove();
      shown.clear();
    },
  };
}
