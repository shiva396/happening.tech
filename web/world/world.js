import { CAMERA, HOME, clamp, holdAnchor, radiusAt, unproject, wrap } from "./camera.js";
import { makeOverlays } from "./overlays.js";
import { makeSurface } from "./surface.js";

export async function mountWorld(stage, options = {}) {
  const lifetime = new AbortController();
  const listen = (target, name, fn, config = {}) =>
    target.addEventListener(name, fn, { ...config, signal: lifetime.signal });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const camera = { ...HOME };
  const hit = document.createElement("div");
  hit.className = "world-touch";
  hit.tabIndex = 0;
  hit.setAttribute("role", "group");
  hit.setAttribute(
    "aria-label",
    "Interactive globe. Drag or use arrow keys to rotate. Use plus or minus to zoom and Home to reset.",
  );
  let canvas = document.createElement("canvas");
  canvas.className = "world-surface";
  canvas.setAttribute("aria-hidden", "true");
  stage.append(canvas, hit);
  const overlay = makeOverlays(stage, (group, level) => {
    const place = group.representative;
    if (group.items.length > 1 && level < 3) {
      // Skip empty intermediate levels when a city's listings all share the same coordinates.
      const colocated = group.items.every(
        (p) =>
          p.city === place.city &&
          Math.abs(p.latitude - place.latitude) < 0.03 &&
          Math.abs(p.longitude - place.longitude) < 0.03,
      );
      flyTo(
        place.latitude,
        place.longitude,
        colocated
          ? CAMERA.eventZoom
          : [CAMERA.overviewZoom, CAMERA.countryZoom, CAMERA.regionZoom, CAMERA.cityZoom][level + 1] + 0.05,
      );
    } else {
      focus(place);
      options.onSelect?.(place);
    }
  });
  overlay.setPlaces(options.places || []);
  let width = 0,
    height = 0,
    visible = false,
    renderer,
    disposed = false;
  let frame = 0,
    previous = 0,
    idleTimer = 0,
    settleTimer = 0,
    flight = null;
  let velocityX = 0,
    velocityY = 0;
  let motionPreference = true,
    allowIdle = true,
    idle = false,
    quality = 1.75,
    slowFrames = 0;
  let lastCamera = "",
    tapSequence = 0,
    safariGesture,
    wheelTimer = 0,
    suppressClick = false;
  const pointers = new Map();
  let drag = null,
    pinch = null;
  const animated = () => motionPreference && !reduced.matches;
  let reading = false, readerRadius = 0;
  const readerFrame = stage.closest(".world-frame");
  const readingScale = Number(getComputedStyle(stage).getPropertyValue("--reading-scale")) || 1;
  const canDraw = () => !disposed && visible && !document.hidden && width > 0 && height > 0;

  function queue() {
    if (!frame && canDraw()) frame = requestAnimationFrame(draw);
  }
  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!reading && allowIdle && animated() && canDraw() && !renderer?.software) {
      idleTimer = setTimeout(() => {
        if (reading || !allowIdle || !animated() || !canDraw()) return;
        idle = true;
        previous = 0;
        queue();
      }, CAMERA.idleDelay);
    }
  }
  function interrupt() {
    tapSequence++;
    allowIdle = idle = false;
    clearTimeout(idleTimer);
    clearTimeout(settleTimer);
    flight = null;
    velocityX = velocityY = 0;
  }
  function settle() {
    if (renderer?.software) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (!pointers.size && !flight) queue();
      }, 120);
    }
  }
  function flyTo(latitude, longitude, zoom = camera.zoom) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(zoom)) return;
    interrupt();
    const destination = {
      latitude: clamp(latitude, -CAMERA.maxLatitude, CAMERA.maxLatitude),
      longitude: wrap(longitude),
      zoom: clamp(zoom, CAMERA.minZoom, CAMERA.maxZoom),
    };
    if (!animated() || !canDraw() || !renderer) {
      Object.assign(camera, destination);
      queue();
      return;
    }
    flight = {
      from: { ...camera },
      to: destination,
      lonDelta: wrap(destination.longitude - camera.longitude),
      start: performance.now(),
    };
    queue();
  }
  function zoomBy(factor) {
    if (Number.isFinite(factor) && factor > 0)
      flyTo(camera.latitude, camera.longitude, (flight?.to.zoom ?? camera.zoom) * factor);
  }
  function focus(place) {
    overlay.setFocus(place);
    if (place && Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
      flyTo(place.latitude, place.longitude, CAMERA.eventZoom);
    queue();
  }
  function reset() {
    overlay.setFocus(null);
    flyTo(HOME.latitude, HOME.longitude, HOME.zoom);
    allowIdle = true;
    scheduleIdle();
  }
  function draw(now) {
    frame = 0;
    if (!canDraw()) return;
    const elapsed = previous ? now - previous : 16;
    const dt = Math.min(42, elapsed);
    previous = now;
    let moving = false;
    if (flight) {
      const t = animated() ? Math.min(1, (now - flight.start) / CAMERA.flyDuration) : 1;
      const s = t * t * (3 - 2 * t),
        { from, to, lonDelta } = flight;
      camera.latitude = from.latitude + (to.latitude - from.latitude) * s;
      camera.longitude = wrap(from.longitude + lonDelta * s);
      camera.zoom = from.zoom + (to.zoom - from.zoom) * s;
      moving = t < 1;
      if (!moving) {
        flight = null;
        settle();
      }
    } else if (animated() && Math.abs(velocityX) + Math.abs(velocityY) > 0.001) {
      camera.longitude = wrap(camera.longitude + velocityX * dt);
      camera.latitude = clamp(camera.latitude + velocityY * dt, -CAMERA.maxLatitude, CAMERA.maxLatitude);
      const fade = Math.exp(-dt * CAMERA.inertiaDecay);
      velocityX *= fade;
      velocityY *= fade;
      moving = true;
    } else if (idle && allowIdle && animated() && renderer && !renderer.software) {
      camera.longitude = wrap(camera.longitude + (CAMERA.idleDegreesPerSecond * dt) / 1000);
      moving = true;
    }
    if (moving && elapsed > 29 && elapsed < 180) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 8) {
      quality = Math.max(0.8, quality - 0.2);
      slowFrames = 0;
    }
    // During renderer initialization the poster and cards retain their shared first frame.
    const view = renderer ? camera : HOME,
      r = radiusAt(width, height, view.zoom);
    renderer?.draw(width, height, r, view, Boolean(moving || pointers.size || safariGesture || wheelTimer), quality, reading ? readingScale : 1, reading ? readerRadius : 0);
    stage.dataset.rendered = String(Boolean(renderer));
    const diameter = Math.ceil(r * 2) + "px";
    if (stage.style.getPropertyValue("--hit-size") !== diameter) stage.style.setProperty("--hit-size", diameter);
    if (!reading) overlay.draw(view, width, height, r);
    const key = [view.longitude.toFixed(1), view.latitude.toFixed(1), view.zoom.toFixed(2)].join("/");
    if (key !== lastCamera) {
      lastCamera = key;
      options.onCamera?.({ ...view });
    }
    if (moving) queue();
    else {
      previous = 0;
      if (!pointers.size && (velocityX || velocityY)) {
        velocityX = velocityY = 0;
        settle();
      }
    }
  }
  function pause() {
    cancelAnimationFrame(frame);
    frame = previous = 0;
    clearTimeout(idleTimer);
    clearTimeout(settleTimer);
    clearTimeout(wheelTimer);
    wheelTimer = 0;
    idle = false;
  }
  function resume() {
    queue();
    scheduleIdle();
  }
  const resize = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect;
    width = rect.width;
    height = rect.height;
    if (readerFrame) readerRadius = parseFloat(getComputedStyle(readerFrame, "::after").width) / 2 || 0;
    const diameter = radiusAt(width, height, 1) * 2;
    stage.style.setProperty("--earth-diameter", diameter + "px");
    queue();
  });
  resize.observe(stage);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
    else pause();
  });
  observer.observe(stage);
  listen(document, "visibilitychange", () => {
    if (document.hidden) pause();
    else resume();
  });
  listen(reduced, "change", () => {
    if (!animated()) {
      idle = false;
      velocityX = velocityY = 0;
    }
    resume();
  });
  listen(hit, "focus", () => {
    allowIdle = idle = false;
    clearTimeout(idleTimer);
  });
  listen(hit, "keydown", (e) => {
    const step = e.shiftKey ? 25 : 10;
    const dir = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (dir) flyTo(camera.latitude + dir[1], camera.longitude + dir[0], camera.zoom);
    else if (["=", "+", "-"].includes(e.key)) zoomBy(e.key === "-" ? 1 / 1.24 : 1.24);
    else if (e.key === "Home") reset();
    else return;
    e.preventDefault();
  });
  function offset(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return { x: clientX - rect.left - rect.width / 2, y: rect.top + rect.height / 2 - clientY };
  }
  function anchorAt(point) {
    const r = radiusAt(width, height, camera.zoom);
    return unproject(point.x / r, point.y / r, camera);
  }
  function directZoom(factor, point, anchor) {
    camera.zoom = clamp(camera.zoom * factor, CAMERA.minZoom, CAMERA.maxZoom);
    const r = radiusAt(width, height, camera.zoom);
    holdAnchor(camera, anchor, point.x / r, point.y / r);
    queue();
  }
  function touchPair() {
    const [a, b] = pointers.values();
    return {
      point: offset((a.x + b.x) / 2, (a.y + b.y) / 2),
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    };
  }
  listen(stage, "wheel", (e) => {
    if (reading || !renderer) return;
    e.preventDefault();
    if (safariGesture || pointers.size) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
    const point = offset(e.clientX, e.clientY);
    interrupt();
    directZoom(Math.exp(-clamp(e.deltaY * unit * (e.ctrlKey ? .014 : .0035), -.8, .8)), point, anchorAt(point));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTimer = 0; queue(); }, 95);
  }, { passive: false });
  function safariPoint(e) {
    return Number.isFinite(e.clientX) && Number.isFinite(e.clientY)
      ? offset(e.clientX, e.clientY) : { x: 0, y: 0 };
  }
  listen(stage, "gesturestart", (e) => {
    if (reading || !renderer) return;
    e.preventDefault();
    if (!pointers.size) {
      interrupt();
      safariGesture = { scale: 1, anchor: anchorAt(safariPoint(e)) };
    }
  }, { passive: false });
  listen(stage, "gesturechange", (e) => {
    if (reading) return;
    e.preventDefault();
    if (safariGesture && !pointers.size && e.scale > 0) {
      directZoom((e.scale / safariGesture.scale) ** CAMERA.pinchGain, safariPoint(e), safariGesture.anchor);
      safariGesture.scale = e.scale;
    }
  }, { passive: false });
  listen(stage, "gestureend", () => {
    safariGesture = null;
    queue();
  });
  listen(stage, "click", (e) => {
    if (suppressClick && e.detail) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });
  function startDrag(pos, moved = false) {
    drag = { ...pos, lastX: pos.x, lastY: pos.y, time: performance.now(), moved, dx: 0, dy: 0 };
  }
  listen(stage, "pointerdown", (e) => {
    const button = e.target.closest(".world-postcard");
    if (reading || e.button !== 0 || pointers.size >= 2 || !renderer || (!button && e.target !== hit && !pointers.size)) return;
    if (!pointers.size) suppressClick = false;
    safariGesture = null;
    interrupt();
    if (!button) hit.focus({ preventScroll: true });
    (button || stage).setPointerCapture(e.pointerId);
    const pos = { x: e.clientX, y: e.clientY, button };
    pointers.set(e.pointerId, pos);
    if (pointers.size === 2) {
      for (const id of pointers.keys()) stage.setPointerCapture(id);
      const pair = touchPair();
      pinch = { distance: pair.distance, anchor: anchorAt(pair.point) };
      suppressClick = true;
      drag = null;
    } else startDrag(pos);
  });
  listen(stage, "pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const pos = pointers.get(e.pointerId);
    pos.x = e.clientX;
    pos.y = e.clientY;
    if (pinch) {
      const pair = touchPair();
      directZoom((pair.distance / pinch.distance) ** CAMERA.pinchGain, pair.point, pinch.anchor);
      pinch.distance = pair.distance;
      return;
    }
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 3) return;
    if (!drag.moved) stage.setPointerCapture(e.pointerId);
    drag.moved = suppressClick = true;
    hit.classList.add("world-turning");
    const now = performance.now(),
      elapsed = Math.max(8, now - drag.time);
    const factor = CAMERA.dragDegrees / radiusAt(width, height, camera.zoom);
    const dx = (drag.lastX - e.clientX) * factor,
      dy = (e.clientY - drag.lastY) * factor;
    camera.longitude = wrap(camera.longitude + dx);
    camera.latitude = clamp(camera.latitude + dy, -CAMERA.maxLatitude, CAMERA.maxLatitude);
    drag.dx = clamp(dx / elapsed, -0.22, 0.22);
    drag.dy = clamp(dy / elapsed, -0.22, 0.22);
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.time = now;
    queue();
  });
  async function tap(e) {
    const rect = stage.getBoundingClientRect(),
      r = radiusAt(width, height, camera.zoom);
    const geo = unproject(
      (e.clientX - rect.left - width / 2) / r,
      (height / 2 - e.clientY + rect.top) / r,
      camera,
    );
    if (!geo || !options.onCountry) return;
    const seq = ++tapSequence;
    try {
      const { countryAt } = await import("./locations.js");
      const country = await countryAt(...geo);
      if (country && seq === tapSequence && !disposed) {
        options.onCountry(country, geo[1], geo[0]);
      }
    } catch {
      /* Existing photo targets and program links remain available offline. */
    }
  }
  function end(e) {
    if (!pointers.delete(e.pointerId)) return;
    if (e.type === "pointerup" && drag && !pinch) {
      if (!drag.moved && !drag.button) tap(e);
      else if (animated() && performance.now() - drag.time < 90) {
        velocityX = drag.dx;
        velocityY = drag.dy;
      }
    }
    pinch = drag = null;
    hit.classList.remove("world-turning");
    for (const pos of pointers.values()) startDrag(pos, true);
    queue();
    settle();
  }
  for (const event of ["pointerup", "pointercancel"]) listen(stage, event, end);
  listen(stage, "lostpointercapture", (e) => {
    if (!stage.hasPointerCapture(e.pointerId)) end(e);
  });
  function setMotion(value) {
    motionPreference = Boolean(value);
    stage.dataset.motion = motionPreference ? "on" : "off";
    idle = false;
    velocityX = velocityY = 0;
    allowIdle = motionPreference;
    clearTimeout(idleTimer);
    scheduleIdle();
    queue();
  }
  let version = 0;
  async function initSurface(software = false) {
    const current = ++version;
    let surface;
    try {
      if (!software) surface = await makeSurface(canvas, queue);
    } catch {
      /* Fall through to the raster renderer. */
    }
    if (disposed || current !== version) {
      surface?.dispose();
      return;
    }
    if (!surface) {
      // A canvas can acquire only one context type.
      const fresh = canvas.cloneNode(false);
      canvas.replaceWith(fresh);
      canvas = fresh;
      try {
        const { makeSoftwareSurface } = await import("./software.js");
        surface = await makeSoftwareSurface(canvas, queue);
      } catch {
        /* The static map stays visible on texture/network failure. */
      }
    }
    if (disposed || current !== version) {
      surface?.dispose();
      return;
    }
    renderer = surface;
    if (renderer) {
      stage.dataset.engine = renderer.software ? "canvas" : "webgl";
      queue();
      scheduleIdle();
    }
  }
  listen(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    renderer?.dispose();
    renderer = null;
    stage.dataset.rendered = "false";
    initSurface(true);
  });
  initSurface();
  function destroy() {
    if (disposed) return;
    disposed = true;
    pause();
    lifetime.abort();
    resize.disconnect();
    observer.disconnect();
    renderer?.dispose();
    overlay.dispose();
    canvas.remove();
    hit.remove();
    delete stage.dataset.rendered;
    delete stage.dataset.engine;
  }
  listen(window, "pagehide", (e) => {
    if (!e.persisted) destroy();
    else pause();
  });
  listen(window, "pageshow", resume);
  return {
    setReading(value) {
      if (reading === value) return;
      reading = value;
      if (reading) {
        pause();
        velocityX = velocityY = 0;
        queue();
      } else resume();
    },
    focus,
    flyTo,
    reset,
    zoomBy,
    setMotion,
    destroy,
    setPlaces(places) {
      overlay.setPlaces(places);
      queue();
    },
  };
}
