import { feature, geoArea, geoCentroid, geoOrthographic, geoPath } from "./vendor/globe/geo.js";

import { paintEarth } from "./earth-relief.js";

async function mountGlobe() {
  const svg = document.getElementById("country-globe");
  if (!svg) return;
  const atlas = svg.closest(".country-atlas");
  const select = document.getElementById("country");
  const response = await fetch("/art/countries.json");
  if (!response.ok) return;
  const topology = await response.json();
  const countries = feature(topology, topology.objects.countries).features;
  const eventCountries = new Set(
    [...select.querySelectorAll('optgroup[label="With upcoming events"] option')].map((o) => o.value),
  );
  const projection = geoOrthographic().translate([260, 177]).precision(0.65);
  const path = geoPath(projection).digits(1);
  const ns = "http://www.w3.org/2000/svg";
  function element(tag, attrs, parent) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }
  const defs = element("defs", {}, svg);
  const light = element("radialGradient", { id: "globe-light", cx: ".34", cy: ".27", r: ".78" }, defs);
  for (const [offset, color, opacity] of [
    [0, "#fff8ed", 0.27],
    [0.57, "#fff8ed", 0],
    [0.85, "#42465f", 0.065],
    [1, "#353953", 0.24],
  ]) {
    element("stop", { offset, "stop-color": color, "stop-opacity": opacity }, light);
  }
  const shadow = element("radialGradient", { id: "globe-shadow" }, defs);
  element("stop", { offset: 0, "stop-color": "#61556e", "stop-opacity": 0.2 }, shadow);
  element("stop", { offset: 1, "stop-color": "#61556e", "stop-opacity": 0 }, shadow);
  element("ellipse", { cx: 260, cy: 334, rx: 104, ry: 7, fill: "url(#globe-shadow)" }, svg);
  const ocean = element("circle", { cx: 260, cy: 177, fill: "var(--sea)" }, svg);
  const lands = element("g", {}, svg);
  const shapes = countries.map((country) => {
    const name = country.properties.name;
    const node = element("path", { "data-country": name, class: "globe-land" }, lands);
    node.classList.toggle("has-events", eventCountries.has(name));
    element("title", {}, node).textContent = name;
    return { country, node, name };
  });
  const shade = element(
    "circle",
    { cx: 260, cy: 177, fill: "url(#globe-light)", "pointer-events": "none" },
    svg,
  );
  const focusRing = element("circle", {cx: 260, cy: 177, class: "globe-focus", "pointer-events": "none"}, svg);
  const label = element("g", { "pointer-events": "none" }, svg);
  const badge = element("rect", { class: "globe-tag", height: 19, y: -9.5, rx: 9.5 }, label);
  const caption = element("text", { class: "globe-tag-text", y: 3.6 }, label);

  // For overseas territories, centre the primary landmass of the selected country.
  function centre(country) {
    const geo = country.geometry;
    if (geo.type !== "MultiPolygon") return geoCentroid(geo);
    const largest = geo.coordinates
      .map((coordinates) => ({ type: "Polygon", coordinates }))
      .reduce((a, b) => (geoArea(a) > geoArea(b) ? a : b));
    return geoCentroid(largest);
  }

  let longitude = 79,
    latitude = 22,
    zoom = 1,
    point,
    flight,
    drawing,
    drag;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const wrap = (value) => ((((value + 540) % 360) + 360) % 360) - 180;
  const canvas = atlas.querySelector(".earth-surface");
  let paint;
  function draw() {
    drawing = 0;
    const radius = 153 * zoom;
    projection.rotate([-longitude, -latitude]).scale(radius);
    ocean.setAttribute("r", radius);
    shade.setAttribute("r", radius);
    focusRing.setAttribute("r", radius + 2.2);
    if (paint) {
      // Match the SVG viewBox (72 0 376 350) with its centred aspect ratio.
      const scale = Math.min(svg.clientWidth / 376, svg.clientHeight / 350);
      const diameter = radius * 2 * scale;
      canvas.style.width = canvas.style.height = diameter + "px";
      canvas.style.top = "calc(50% + " + 2 * scale + "px)";
      paint(longitude, latitude);
    }
    for (const shape of shapes) shape.node.setAttribute("d", path(shape.country) || "");
    if (point) {
      const [x, y] = projection(point);
      const rad = Math.PI / 180;
      const facing =
        Math.sin(latitude * rad) * Math.sin(point[1] * rad) +
        Math.cos(latitude * rad) * Math.cos(point[1] * rad) * Math.cos((longitude - point[0]) * rad);
      const show = facing > 0.15 && y > 8 && y < 316 && x > 25 && x < 495;
      label.style.display = show ? "" : "none";
      label.setAttribute("transform", "translate(" + x + " " + (y + 15) + ")");
    } else label.style.display = "none";
  }
  function requestDraw() {
    if (!drawing) drawing = requestAnimationFrame(draw);
  }
  function fly(target, animate) {
    cancelAnimationFrame(flight);
    const lon = longitude,
      lat = latitude,
      delta = wrap(target[0] - lon);
    if (!animate || reduced.matches) {
      [longitude, latitude] = target;
      requestDraw();
      return;
    }
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / 550),
        ease = 1 - (1 - p) ** 3;
      longitude = wrap(lon + delta * ease);
      latitude = lat + (target[1] - lat) * ease;
      requestDraw();
      if (p < 1) flight = requestAnimationFrame(tick);
    }
    flight = requestAnimationFrame(tick);
  }
  function selectCountry(animate) {
    const selected = shapes.find((s) => s.name === select.value);
    for (const shape of shapes) shape.node.classList.toggle("selected", shape.name === select.value);
    point = selected ? centre(selected.country) : null;
    label.style.display = "";
    caption.textContent = select.value;
    const width = Math.max(38, caption.getComputedTextLength() + 16);
    badge.setAttribute("width", width);
    badge.setAttribute("x", -width / 2);
    fly(point || [79, 22], animate);
  }

  const controls = atlas.querySelector(".globe-controls");
  function updateZoom(value) {
    zoom = clamp(value, 1, 2.6);
    controls.querySelector('[data-globe-action="out"]').disabled = zoom <= 1;
    controls.querySelector('[data-globe-action="in"]').disabled = zoom >= 2.6;
    requestDraw();
  }
  controls.addEventListener("click", (e) => {
    const action = e.target.closest("button")?.dataset.globeAction;
    if (action === "reset") {
      updateZoom(1);
      selectCountry(true);
    } else if (action) updateZoom(zoom + (action === "in" ? 0.4 : -0.4));
  });
  svg.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    cancelAnimationFrame(flight);
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lon: longitude,
      lat: latitude,
      name: e.target.closest("[data-country]")?.dataset.country,
      moved: false,
    };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    svg.classList.add("is-turning");
    const factor = 110 / (((svg.getBoundingClientRect().height * 153) / 350) * zoom);
    longitude = wrap(drag.lon - dx * factor);
    latitude = clamp(drag.lat + dy * factor, -85, 85);
    requestDraw();
  });
  svg.addEventListener("pointerup", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const { moved, name } = drag;
    drag = null;
    svg.classList.remove("is-turning");
    if (!moved && name) {
      select.value = name;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  svg.addEventListener("lostpointercapture", () => {
    drag = null;
    svg.classList.remove("is-turning");
  });
  svg.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 25 : 10,
      dir = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!dir) return;
    e.preventDefault();
    cancelAnimationFrame(flight);
    longitude = wrap(longitude + dir[0]);
    latitude = clamp(latitude + dir[1], -85, 85);
    requestDraw();
  });
  select.addEventListener("change", () => selectCountry(true));
  window.addEventListener("pageshow", () => selectCountry(false));
  svg.removeAttribute("hidden");
  atlas.querySelector(".globe-fallback").hidden = true;
  controls.hidden = false;
  updateZoom(1);
  selectCountry(false);
  try {
    paint = await paintEarth(canvas);
    atlas.classList.add("has-relief");
    ocean.setAttribute("fill", "transparent");
    canvas.hidden = false;
    new ResizeObserver(requestDraw).observe(svg);
    requestDraw();
  } catch {
    // Country paths keep the globe interactive if the physical map cannot load.
  }
}

mountGlobe().catch((error) => console.warn("Globe illustration unavailable.", error));
