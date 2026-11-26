// dotlottie-wc 0.12.2 bundles the web component; its matching 0.83.2
// Canvas/WASM runtime and the animations are served from this project.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Map();
  let component;
  function loadComponent() {
    component ??= import("/vendor/dotlottie-wc-0.12.2/dotlottie-wc.js")
      .then(module => module.setWasmUrl("/vendor/dotlottie-wc-0.12.2/dotlottie-player.wasm"));
    return component;
  }

  async function play(slot, loop = false) {
    if (!slot || reduced.matches || !slot.getClientRects().length) return;
    active.get(slot)?.();
    const player = document.createElement("dotlottie-wc");
    function finish() {
      player.remove();
      slot.removeAttribute("data-playing");
      if (loop) slot.setAttribute('aria-pressed', 'false');
      active.delete(slot);
    }
    active.set(slot, finish);
    try {
      await loadComponent();
      if (active.get(slot) !== finish) return;
      if (!slot.getClientRects().length || document.hidden || reduced.matches) {
        finish();
        return;
      }
      player.setAttribute("src", "/motion/" + slot.dataset.motion + ".json");
      player.setAttribute("autoplay", "");
      if (loop) player.setAttribute("loop", "");
      slot.append(player);
      const animation = player.dotLottie;
      animation.addEventListener("load", () => {
        slot.setAttribute("data-playing", "");
        if (loop) slot.setAttribute("aria-pressed", "true");
      });
      animation.addEventListener("complete", finish);
      animation.addEventListener("loadError", finish);
      animation.addEventListener("renderError", finish);
    } catch {
      if (active.get(slot) === finish) finish();
    }
  }

  const artwork = document.querySelector(".ticket-moths");
  if (artwork) {
    const stop = () => active.get(artwork)?.();
    artwork.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse" && !active.has(artwork)) play(artwork, true);
    });
    artwork.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse") stop();
    });
    artwork.addEventListener("click", () => {
      if (active.has(artwork)) stop();
      else play(artwork, true);
    });
    artwork.addEventListener("blur", stop);
    artwork.addEventListener("keydown", event => { if (event.key === "Escape") stop(); });
    const syncPreference = () => { artwork.disabled = reduced.matches; };
    syncPreference();
    reduced.addEventListener("change", syncPreference);
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }).observe(artwork);
  }

  document.addEventListener("play-motion", event => play(event.target.closest("[data-motion]")));
  document.addEventListener("click", event => {
    const link = event.target.closest("a.calendar-action");
    if (link && !event.defaultPrevented) play(link.querySelector("[data-motion]"));
  });
  function stopAll() {
    for (const finish of active.values()) finish();
  }
  reduced.addEventListener("change", () => { if (reduced.matches) stopAll(); });
  window.addEventListener("pagehide", stopAll);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAll(); });
})();
