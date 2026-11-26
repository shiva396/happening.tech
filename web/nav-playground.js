import { loadComponent } from "./lottie-player.js";

const minute = 60_000;
const storageKey = "nav-performance:" + document.baseURI;
const ensemble = new EventTarget();
const cache = new Map();
function asset(url, json = false) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url, { cache: "no-cache" })
        .then((response) => {
          if (!response.ok) throw new Error("Missing navigation asset: " + url);
          return json ? response.json() : response.arrayBuffer();
        })
        .catch((error) => {
          cache.delete(url);
          throw error;
        }),
    );
  }
  return cache.get(url);
}

// Both links use the same beat, including across full-page navigation in this tab.
let firstBeat = Date.now() + minute;
try {
  firstBeat = Number(sessionStorage.getItem(storageKey + ":beat")) || firstBeat;
  sessionStorage.setItem(storageKey + ":beat", String(firstBeat));
} catch {
  /* A page-local clock also works when storage is unavailable. */
}
function scheduleBeat() {
  const now = Date.now();
  const delay = firstBeat > now ? firstBeat - now : minute - ((now - firstBeat) % minute);
  return setTimeout(() => {
    if (!document.hidden) ensemble.dispatchEvent(new Event("play"));
    beatTimer = scheduleBeat();
  }, delay);
}
let beatTimer;
function syncBeat() {
  clearTimeout(beatTimer);
  if (!document.hidden) beatTimer = scheduleBeat();
}
document.addEventListener("visibilitychange", syncBeat);
window.addEventListener("pagehide", () => clearTimeout(beatTimer));
window.addEventListener("pageshow", syncBeat);
syncBeat();

function route(url) {
  return new URL(url).pathname.replace(/\/$/, "");
}

function loadPlane(host, data, id, signal) {
  return new Promise((resolve, reject) => {
    const player = document.createElement("dotlottie-wc");
    host.append(player);
    const clip = player.dotLottie;
    signal.addEventListener(
      "abort",
      () => {
        player.remove();
        reject(signal.reason);
      },
      { once: true },
    );
    clip.addEventListener("loadError", reject);
    clip.addEventListener("load", () => {
      // The entrance starts below the clipped underline. The link observer owns visibility.
      clip.setRenderConfig({ freezeOnOffscreen: false });
      resolve(clip);
    });
    const load = () => clip.load({ data, animationId: id, autoplay: false, loop: false });
    if (clip.isReady) load();
    else clip.addEventListener("ready", load);
  });
}

class NavPerformance extends HTMLElement {
  connectedCallback() {
    const animal = this.dataset.animal;
    const archive = "motion/animals/" + animal + ".lottie";
    const link = this.closest("a");
    const label = link.querySelector(".nav-label");
    const back = this.querySelector(".nav-back"),
      front = this.querySelector(".nav-front");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    let visible = false,
      away = false,
      requested = false,
      run;
    const handoff = storageKey + ":click:" + animal;
    try {
      const at = Number(sessionStorage.getItem(handoff));
      sessionStorage.removeItem(handoff);
      requested = at > Date.now() - 30_000 && route(location.href) === route(link.href);
    } catch {
      /* Navigation works independently of session storage. */
    }

    function stop() {
      run?.abort();
      run = null;
      link.style.removeProperty("--actor-x");
      link.style.removeProperty("--actor-y");
    }

    async function perform() {
      const session = new AbortController();
      const { signal } = session;
      run = session;
      try {
        const [data, paths] = await Promise.all([
          asset(archive),
          asset("motion/animals/paths.json", true),
          loadComponent(),
        ]);
        if (signal.aborted) return;
        const [body, paws] = await Promise.all([
          loadPlane(back, data, "body", signal),
          loadPlane(front, data, "paws", signal),
        ]);
        if (signal.aborted) return;

        const poses = paths[animal];
        const measure = document.createElement("canvas").getContext("2d");
        let geometry;
        function resize() {
          const stage = back.getBoundingClientRect(),
            text = label.getBoundingClientRect();
          const style = getComputedStyle(label);
          measure.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
          const metrics = measure.measureText("m");
          const baseline =
            text.top -
            stage.top +
            (text.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
          geometry = {
            left: text.left - stage.left,
            width: text.width,
            floor: stage.height,
            ledge: baseline - metrics.actualBoundingBoxAscent,
            size: back.firstElementChild.offsetWidth,
          };
        }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(link);
        observer.observe(label);
        signal.addEventListener("abort", () => observer.disconnect(), { once: true });

        function place(frame) {
          const index = Math.min(poses.length - 1, Math.max(0, frame / 2));
          const a = poses[Math.floor(index)],
            b = poses[Math.ceil(index)],
            t = index % 1;
          const blend = (i) => a[i] + (b[i] - a[i]) * t;
          const { left, width, floor, ledge, size } = geometry;
          link.style.setProperty("--actor-x", left + width * blend(0) - size / 2 + "px");
          link.style.setProperty("--actor-y", ledge + (floor - ledge) * blend(1) + size * blend(2) + "px");
          // One master clock preserves the overlap between feet and live lettering.
          if (Math.floor(paws.currentFrame / 2) !== Math.floor(frame / 2)) paws.setFrame(Math.floor(frame));
        }
        place(0);
        body.addEventListener("frame", ({ currentFrame }) => {
          if (!signal.aborted) place(currentFrame);
        });
        body.addEventListener("complete", () => {
          if (signal.aborted) return;
          stop();
        });
        body.play();
      } catch {
        if (!signal.aborted) {
          // A successful HTTP response can still contain an unreadable archive.
          cache.delete(archive);
          stop();
        }
      }
    }

    function sync() {
      if (away || document.hidden || reduced.matches) {
        requested = false;
        stop();
      } else if (!visible) {
        stop();
      } else if (requested) {
        requested = false;
        if (!run) perform();
      }
    }

    function interact() {
      requested = true;
      sync();
    }
    ensemble.addEventListener(
      "play",
      () => {
        if (visible) interact();
      },
      options,
    );
    link.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType !== "touch") interact();
      },
      options,
    );
    link.addEventListener(
      "focus",
      () => {
        if (link.matches(":focus-visible")) interact();
      },
      options,
    );
    link.addEventListener(
      "click",
      (event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          reduced.matches
        )
          return;
        // Preserve the native link. Start the clicked animal's take on the destination.
        try {
          sessionStorage.setItem(handoff, String(Date.now()));
        } catch {
          /* Storage may be disabled. */
        }
        interact();
      },
      options,
    );
    reduced.addEventListener("change", sync, options);
    document.addEventListener("visibilitychange", sync, options);
    window.addEventListener(
      "pagehide",
      () => {
        away = true;
        sync();
      },
      options,
    );
    window.addEventListener(
      "pageshow",
      () => {
        away = false;
        sync();
      },
      options,
    );
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(link);
    this.release = () => {
      stop();
      listeners.abort();
      observer.disconnect();
    };
  }

  disconnectedCallback() {
    this.release?.();
  }
}
customElements.define("nav-performance", NavPerformance);
