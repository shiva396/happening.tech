import { loadComponent } from "./lottie-player.js";

// dotlottie-wc 0.12.2 bundles the web component; its matching 0.83.2
// Canvas/WASM runtime and the animations are served from this project.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Map();
  async function play(slot, loop = false) {
    if (!slot || reduced.matches || !slot.getClientRects().length) return;
    active.get(slot)?.();
    const player = document.createElement("dotlottie-wc");
    function finish() {
      player.remove();
      slot.removeAttribute("data-playing");
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
      player.setAttribute("src", "motion/" + slot.dataset.motion + ".json");
      player.setAttribute("autoplay", "");
      if (loop) player.setAttribute("loop", "");
      slot.append(player);
      const animation = player.dotLottie;
      animation.addEventListener("load", () => {
        slot.setAttribute("data-playing", "");
      });
      animation.addEventListener("complete", finish);
      animation.addEventListener("loadError", finish);
      animation.addEventListener("renderError", finish);
    } catch {
      if (active.get(slot) === finish) finish();
    }
  }

  for (const link of document.querySelectorAll(".community-action")) {
    const animate = () => {
      const slot = link.querySelector("[data-motion]");
      if (!active.has(slot)) play(slot);
    };
    link.addEventListener("pointerenter", animate);
    link.addEventListener("focus", animate);
    link.addEventListener("pointerdown", animate);
  }

  const invitation = document.querySelector('.empty-art');
  if (invitation) {
    let inView = false;
    const sync = () => {
      if (inView && !document.hidden && !reduced.matches) {
        if (!active.has(invitation)) play(invitation, true);
      } else active.get(invitation)?.();
    };
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(invitation);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
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
