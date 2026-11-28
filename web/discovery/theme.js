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

    function wave(kind, radius, duration) {
      root.dataset.iris = kind;
      const layer = document.createElement("div");
      layer.className = "theme-iris";
      layer.dataset.target = theme;
      layer.dataset.pass = kind;
      layer.setAttribute("aria-hidden", "true");
      job.layers.push(layer);
      document.body.append(layer);
      job.animation = layer.animate([
        { clipPath: "circle(0px at " + origin + ")" },
        { clipPath: "circle(" + radius + "px at " + origin + ")" },
      ], { duration, easing: "cubic-bezier(.22,.65,.32,1)", fill: "both" });
      return job.animation.finished;
    }
    try {
      await wave("globe", Math.min(disk.width / 2, edge), 360);
      if (running !== job) return;
      if (document.startViewTransition) {
        root.dataset.iris = "screen";
        job.transition = document.startViewTransition(() => {
          if (running !== job) return;
          apply(theme);
          job.layers.forEach(layer => layer.remove());
        });
        // Cancelling before snapshot capture rejects ready even when finished resolves.
        job.transition.ready.catch(() => {});
        await job.transition.finished;
      } else {
        await wave("screen", edge, 450);
        if (running !== job) return;
        apply(theme);
        job.layers[0].remove();
        job.animation = job.layers[1].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "both" });
        await job.animation.finished;
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
