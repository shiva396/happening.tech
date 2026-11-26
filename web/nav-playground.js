import { loadComponent } from "./lottie-player.js";

const cooldown = 60_000;
const cache = new Map();
function asset(url, json = false) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
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

// Restore the quiet period across full-page Jaspr links in the same browser tab.
const deadlines = new Map();
function nextAllowed(animal) {
  try {
    return Number(sessionStorage.getItem("nav-rest-" + animal)) || deadlines.get(animal) || 0;
  } catch {
    return deadlines.get(animal) || 0;
  }
}
function rest(animal, until) {
  deadlines.set(animal, until);
  try {
    sessionStorage.setItem("nav-rest-" + animal, String(until));
  } catch {
    /* In-memory fallback. */
  }
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
    const link = this.closest("a");
    const label = link.querySelector(".nav-label");
    const back = this.querySelector(".nav-back"),
      front = this.querySelector(".nav-front");
    const current = link.hasAttribute("aria-current");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    let visible = false,
      hovered = false,
      focused = false,
      away = false;
    let run,
      timer,
      failed = false;

    function stop() {
      clearTimeout(timer);
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
          asset("motion/animals/" + animal + ".lottie"),
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
          rest(animal, Date.now() + cooldown);
          stop();
          sync();
        });
        rest(animal, Date.now() + 10_000 + cooldown);
        body.play();
      } catch {
        if (!signal.aborted) {
          failed = true;
          stop();
        }
      }
    }

    function sync() {
      clearTimeout(timer);
      if (!visible || away || document.hidden || reduced.matches) {
        stop();
        return;
      }
      if (run || failed || !(current || hovered || focused)) return;
      const wait = nextAllowed(animal) - Date.now();
      if (wait > 0) timer = setTimeout(sync, wait);
      else perform();
    }
    link.addEventListener(
      "pointerenter",
      (e) => {
        hovered = e.pointerType !== "touch";
        sync();
      },
      options,
    );
    link.addEventListener(
      "pointerleave",
      () => {
        hovered = false;
        sync();
      },
      options,
    );
    link.addEventListener(
      "focus",
      () => {
        focused = link.matches(":focus-visible");
        sync();
      },
      options,
    );
    link.addEventListener(
      "blur",
      () => {
        focused = false;
        sync();
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
