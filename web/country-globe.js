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
  const projection = geoOrthographic().translate([260, 177]).precision(0.35);
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
  const focusRing = element(
    "circle",
    { cx: 260, cy: 177, class: "globe-focus", "pointer-events": "none" },
    svg,
  );
  const lettering = element("g", { "pointer-events": "none", "aria-hidden": "true" }, svg);
  const rad = Math.PI / 180;
  // For overseas territories, centre the primary landmass of the selected country.
  function centre(country) {
    const geo = country.geometry;
    if (geo.type !== "MultiPolygon") return geoCentroid(geo);
    const largest = geo.coordinates
      .map((coordinates) => ({ type: "Polygon", coordinates }))
      .reduce((a, b) => (geoArea(a) > geoArea(b) ? a : b));
    return geoCentroid(largest);
  }

  // Place the selected name first, then fill the remaining space with legible land labels.
  const names = shapes
    .map(({ country, name }) => {
      const anchor = centre(country);
      const text = element("text", { class: "globe-name" }, lettering);
      text.textContent = name;
      return { name, text, anchor, area: geoArea(country), width: 0 };
    })
    .sort((a, b) => b.area - a.area);
  let selectedName;
  function measureNames() {
    const context = document.createElement("canvas").getContext("2d");
    context.font = "550 9px " + getComputedStyle(svg).fontFamily;
    for (const name of names) name.width = context.measureText(name.name).width;
  }
  function drawNames(radius, viewWidth, viewHeight, scale) {
    const boxes = [];
    const north = latitude * rad;
    const fontScale = Math.max(1, 10 / (9 * scale));
    lettering.style.setProperty("--globe-name-size", 9 * fontScale + "px");
    const halfWidth = viewWidth / (2 * scale),
      halfHeight = viewHeight / (2 * scale);
    function place(entry, selected) {
      const [lon, lat] = entry.anchor;
      const facing =
        Math.sin(north) * Math.sin(lat * rad) +
        Math.cos(north) * Math.cos(lat * rad) * Math.cos((lon - longitude) * rad);
      const width = (entry.width * (selected ? 1.35 : 1) * fontScale) / 2 + 3;
      const [x, y] = projection(entry.anchor);
      const box = { left: x - width, right: x + width, top: y - 7 * fontScale, bottom: y + 7 * fontScale };
      const fits =
        facing > (selected ? 0.12 : 0.38) &&
        Math.abs(x - 260) + width < halfWidth &&
        Math.abs(y - 175) + 7 < halfHeight &&
        (selected ||
          (entry.area * radius * radius * facing > width * 13 &&
            Math.hypot(Math.abs(x - 260) + width, Math.abs(y - 177) + 6) < radius &&
            !boxes.some(
              (b) => b.left < box.right && b.right > box.left && b.top < box.bottom && b.bottom > box.top,
            )));
      entry.text.style.display = fits ? "" : "none";
      if (!fits) return;
      entry.text.setAttribute("x", x);
      entry.text.setAttribute("y", y);
      boxes.push(box);
    }
    if (selectedName) place(selectedName, true);
    for (const entry of names) if (entry !== selectedName) place(entry, false);
  }
  let longitude = 79,
    latitude = 22,
    zoom = 1,
    targetZoom = 1,
    lastFrame = 0,
    paintedLon,
    paintedLat,
    flight,
    drawing,
    drag;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const wrap = (value) => ((((value + 540) % 360) + 360) % 360) - 180;
  const canvas = atlas.querySelector(".earth-surface");
  const satellite = atlas.querySelector(".satellite-surface");
  const switcher = atlas.querySelector(".map-style");
  const status = atlas.querySelector(".map-status");
  let paint, paintSatellite, satelliteLoad, iris;
  let wanted = "terrain",
    current = "terrain";
  function updateButtons() {
    for (const button of switcher.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.mapStyle === wanted));
    }
  }
  function finishStyle() {
    const animation = iris;
    iris = null;
    current = wanted;
    satellite.hidden = current !== "satellite";
    canvas.hidden = !satellite.hidden;
    atlas.classList.toggle("satellite-view", current === "satellite");
    animation?.cancel();
    requestDraw();
  }
  async function chooseStyle(mode) {
    wanted = mode;
    updateButtons();
    status.hidden = true;
    if (mode === "satellite" && !paintSatellite) {
      try {
        satelliteLoad ??= paintEarth(satellite, "/art/earth-satellite.webp");
        paintSatellite = await satelliteLoad;
      } catch {
        satelliteLoad = null;
        if (wanted === "satellite") {
          wanted = "terrain";
          updateButtons();
          status.textContent = "Satellite imagery couldn’t load. Select Satellite to try again.";
          status.hidden = false;
        }
        return;
      }
    }
    if (mode !== wanted) return;
    if (reduced.matches || !satellite.animate) {
      finishStyle();
      return;
    }
    if (iris) {
      iris.playbackRate = wanted === "satellite" ? 1 : -1;
      iris.play();
      return;
    }
    if (current === wanted) return;
    canvas.hidden = satellite.hidden = false;
    // Keep the incoming texture registered to the same geographic point during a drag or pinch.
    iris = satellite.animate([{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(72% at 50% 50%)" }], {
      duration: 560,
      easing: "cubic-bezier(.45,0,.25,1)",
      fill: "both",
    });
    if (mode === "terrain") {
      iris.currentTime = 560;
      iris.playbackRate = -1;
    }
    iris.onfinish = finishStyle;
    requestDraw();
  }
  switcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-style]");
    if (button) chooseStyle(button.dataset.mapStyle);
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches && iris) finishStyle();
  });
  function draw(now) {
    drawing = 0;
    const dt = lastFrame ? Math.min(48, now - lastFrame) : 16;
    lastFrame = now;
    zoom += (targetZoom - zoom) * (reduced.matches ? 1 : 1 - Math.exp(-dt / 60));
    if (Math.abs(zoom - targetZoom) < .001) zoom = targetZoom;
    const viewWidth = svg.clientWidth, viewHeight = svg.clientHeight;
    const scale = Math.min(viewWidth / 376, viewHeight / 350);
    // Zoom is a uniform transform of the existing orthographic drawing.
    // Only a rotation changes the projected outlines or the sampled terrain.
    if (longitude !== paintedLon || latitude !== paintedLat) {
      projection.rotate([-longitude, -latitude]).scale(153);
      for (const shape of shapes) shape.node.setAttribute("d", path(shape.country) || "");
      paintedLon = longitude;
      paintedLat = latitude;
    }
    lands.setAttribute("transform", "translate(260 177) scale(" + zoom + ") translate(-260 -177)");
    const radius = 153 * zoom;
    projection.scale(radius);
    ocean.setAttribute("r", radius);
    shade.setAttribute("r", radius);
    focusRing.setAttribute("r", radius + 2.2);
    if (paint) {
      // Match the SVG viewBox (72 0 376 350) with its centred aspect ratio.
      const diameter = 306 * scale;
      for (const [layer, renderer] of [
        [canvas, paint],
        [satellite, paintSatellite],
      ]) {
        if (layer.hidden || !renderer) continue;
        layer.style.width = layer.style.height = diameter + "px";
        layer.style.top = "calc(50% + " + 2 * scale + "px)";
        layer.style.transform = "translate(-50%, -50%) scale(" + zoom + ")";
        renderer(longitude, latitude);
      }
    }
    drawNames(radius, viewWidth, viewHeight, scale);
    if (zoom !== targetZoom) requestDraw();
    else lastFrame = 0;
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
    selectedName?.text.classList.remove("is-selected");
    selectedName = names.find((entry) => entry.name === select.value);
    selectedName?.text.classList.add("is-selected");
    for (const shape of shapes) shape.node.classList.toggle("selected", shape.name === select.value);
    fly(selectedName?.anchor || [79, 22], animate);
  }

  const controls = atlas.querySelector(".globe-controls");
  const minZoom = 0.8,
    maxZoom = 4;
  function updateZoom(value, direct = false) {
    targetZoom = clamp(value, minZoom, maxZoom);
    if (direct) zoom = targetZoom;
    controls.querySelector('[data-globe-action="out"]').disabled = targetZoom <= minZoom;
    controls.querySelector('[data-globe-action="in"]').disabled = targetZoom >= maxZoom;
    requestDraw();
  }
  controls.addEventListener("click", (e) => {
    const action = e.target.closest("button")?.dataset.globeAction;
    if (action === "reset") {
      updateZoom(1);
      selectCountry(true);
    } else if (action) updateZoom(targetZoom + (action === "in" ? 0.4 : -0.4));
  });
  svg.addEventListener(
    "wheel",
    (e) => {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      if (Math.hypot(p.x - 260, p.y - 177) > 153 * zoom || !e.deltaY) return;
      const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.clientHeight : 1;
      const factor = Math.exp(-clamp(e.deltaY * units, -240, 240) * (e.ctrlKey ? 0.012 : 0.0025));
      const next = clamp(targetZoom * factor, minZoom, maxZoom);
      if (next === targetZoom && next === zoom && !e.ctrlKey) return;
      e.preventDefault();
      updateZoom(next);
    },
    { passive: false },
  );

  const pointers = new Map();
  let pinch;
  function distance() {
    const [a, b] = pointers.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function startDrag(id, pos, name, moved = false) {
    drag = { id, ...pos, lon: longitude, lat: latitude, name, moved };
  }
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || pointers.size >= 2) return;
    cancelAnimationFrame(flight);
    const pos = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, pos);
    svg.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      pinch = { distance: Math.max(1, distance()), zoom };
      drag = null;
    } else startDrag(e.pointerId, pos, e.target.closest("[data-country]")?.dataset.country);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) {
      updateZoom((pinch.zoom * distance()) / pinch.distance, true);
      return;
    }
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    svg.classList.add("is-turning");
    const scale = Math.min(svg.clientWidth / 376, svg.clientHeight / 350);
    const factor = 110 / (scale * 153 * zoom);
    longitude = wrap(drag.lon - dx * factor);
    latitude = clamp(drag.lat + dy * factor, -85, 85);
    requestDraw();
  });
  function endPointer(e) {
    if (!pointers.delete(e.pointerId)) return;
    const tapped = e.type === "pointerup" && !pinch && drag && !drag.moved && drag.name;
    pinch = drag = null;
    svg.classList.remove("is-turning");
    for (const [id, pos] of pointers) startDrag(id, pos, null, true);
    if (tapped) {
      select.value = tapped;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    svg.addEventListener(type, endPointer);
  svg.addEventListener("keydown", (e) => {
    if (["+", "=", "-"].includes(e.key)) {
      e.preventDefault();
      updateZoom(targetZoom + (e.key === "-" ? -0.4 : 0.4));
      return;
    }
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
  measureNames();
  document.fonts.ready.then(() => {
    measureNames();
    requestDraw();
  });
  updateZoom(1);
  selectCountry(false);
  try {
    paint = await paintEarth(canvas, "/art/earth-relief.webp");
    switcher.hidden = false;
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
