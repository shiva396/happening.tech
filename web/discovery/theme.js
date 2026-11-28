// Keep the live atlas, focus, scroll position and camera in place during the reveal.
export function mountTheme(frame, canAnimate) {
  const root = document.documentElement;
  const button = frame.querySelector(".theme-switch");
  const meta = document.querySelector('meta[name="theme-color"]');
  const system = matchMedia("(prefers-color-scheme: dark)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const key = "flutter.spot.theme";
  let saved = root.dataset.theme, desired, running;

  function controls(theme) {
    desired = theme;
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }
  function apply(theme) {
    root.dataset.theme = theme;
    if (meta) meta.content = theme === "dark" ? "#101925" : "#d7e2e5";
  }
  function finish() {
    if (running) {
      running.transition?.skipTransition();
      running.animation?.cancel();
      running.layers.forEach(layer => layer.remove());
      running = null;
      delete root.dataset.iris;
      root.style.removeProperty("--iris-origin");
      root.style.removeProperty("--iris-edge");
    }
    apply(desired);
  }
  function sync() {
    controls(saved || (system.matches ? "dark" : "light"));
    finish();
  }
  async function reveal(theme) {
    controls(theme);
    if (running || !canAnimate() || document.hidden || !frame.animate) {
      finish();
      return;
    }
    const disk = (frame.querySelector(".world-touch") || frame.querySelector(".atlas-earth-poster")).getBoundingClientRect();
    const x = disk.left + disk.width / 2, y = disk.top + disk.height / 2;
    const edge = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 1;
    const origin = x + "px " + y + "px";
    const job = { layers: [] };
    running = job;
    root.style.setProperty("--iris-origin", origin);
    root.style.setProperty("--iris-edge", edge + "px");

    const closing = theme === "dark";
    const globeRadius = Math.min(disk.width / 2, edge);
    const circle = radius => "circle(" + radius + "px at " + origin + ")";
    function layer(pass) {
      const el = document.createElement("div");
      el.className = "theme-iris";
      el.dataset.pass = pass;
      el.setAttribute("aria-hidden", "true");
      job.layers.push(el);
      document.body.append(el);
      return el;
    }
    function sweep(el, radius, duration) {
      job.animation = el.animate([
        { clipPath: circle(0) }, { clipPath: circle(radius) },
      ], { duration, easing: "cubic-bezier(.22,.65,.32,1)", direction: closing ? "reverse" : "normal", fill: "both" });
      return job.animation.finished;
    }
    function fade(el, from, to) {
      job.animation = el.animate([{ opacity: from }, { opacity: to }], { duration: 120, fill: "both" });
      return job.animation.finished;
    }
    let globeLayer;
    function swap() {
      if (running !== job) return;
      apply(theme);
      if (closing) {
        // The incoming snapshot ends where the final globe pass begins.
        globeLayer = layer("globe");
        globeLayer.style.clipPath = circle(globeRadius);
      } else {
        globeLayer.remove();
      }
    }
    try {
      if (!closing) {
        root.dataset.iris = "globe";
        globeLayer = layer("globe");
        await sweep(globeLayer, globeRadius, 360);
        if (running !== job) return;
      }
      root.dataset.iris = "screen";
      if (document.startViewTransition) {
        job.transition = document.startViewTransition(swap);
        // Cancelling before snapshot capture rejects ready even when finished resolves.
        job.transition.ready.catch(() => {});
        await job.transition.finished;
      } else {
        const plate = layer("screen");
        if (closing) await fade(plate, 0, 1);
        else await sweep(plate, edge, 450);
        if (running !== job) return;
        swap();
        if (closing) await sweep(plate, edge, 450);
        else await fade(plate, 1, 0);
        plate.remove();
      }
      if (closing && running === job) {
        root.dataset.iris = "globe";
        await sweep(globeLayer, globeRadius, 360);
      }
    } catch {
      // The tab can lose visibility while the browser captures a transition.
    } finally {
      if (running === job) finish();
    }
  }
  button.addEventListener("click", () => {
    saved = desired === "light" ? "dark" : "light";
    try { localStorage.setItem(key, saved); } catch {}
    void reveal(saved);
  });
  system.addEventListener("change", () => { if (!saved) sync(); });
  window.addEventListener("storage", e => {
    if (e.key === key || e.key === null) {
      saved = ["light", "dark"].includes(e.newValue) ? e.newValue : undefined;
      sync();
    }
  });
  // A restored page can have missed a preference change in another tab.
  window.addEventListener("pageshow", e => {
    if (!e.persisted) return;
    try { saved = localStorage.getItem(key); } catch {}
    sync();
  });
  const stop = () => { if (running) finish(); };
  window.addEventListener("resize", stop);
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  reduced.addEventListener("change", () => { if (reduced.matches) stop(); });
  new MutationObserver(() => { if (!canAnimate()) stop(); })
    .observe(root, { attributes: true, attributeFilter: ["data-motion"] });
  sync();
}
