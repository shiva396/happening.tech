import { loadComponent } from "./lottie-player.js";

// Keep only requested compressed clips. Switching links can reuse an in-flight fetch.
const clips = new Map();
function loadAnimal(name) {
  if (!clips.has(name)) {
    const request = fetch("/motion/animals/" + name + ".lottie")
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load " + name);
        return response.arrayBuffer();
      })
      .catch((error) => {
        clips.delete(name);
        throw error;
      });
    clips.set(name, request);
  }
  return clips.get(name);
}

function shuffled(names) {
  const bag = [...names];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

class NavPlayground extends HTMLElement {
  connectedCallback() {
    const cast = this.dataset.cast.trim().split(/\s+/).filter(Boolean);
    if (!cast.length) return;
    const controls = new AbortController();
    const options = { signal: controls.signal };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const home = this.querySelector('[aria-current="page"]') || this.querySelector("a");
    let visible = false,
      away = false;
    let hovered, focused, stage, player;
    let animal = cast.includes("monkey") ? "monkey" : cast[0];
    let bag = shuffled(cast.filter((name) => name !== animal));
    let revision = 0;

    function stop() {
      revision++;
      player?.remove();
      player = null;
      stage?.removeAttribute("data-front");
    }

    async function appear() {
      const request = ++revision;
      const move = stage.dataset.move;
      try {
        const [data] = await Promise.all([loadAnimal(animal), loadComponent()]);
        if (request !== revision) return;
        player?.remove();
        stage.removeAttribute("data-front");
        player = document.createElement("dotlottie-wc");
        player.dataset.animal = animal;
        stage.append(player);
        const clip = player.dotLottie;
        let front;
        clip.addEventListener("load", () => {
          if (request !== revision) return;
          const markers = clip.markers();
          const take = markers.find((mark) => mark.name === move);
          front = markers.find((mark) => mark.name === move + "-front");
          clip.setSegment(take.start, take.end - 1);
          clip.setFrame(take.start);
          clip.play();
        });
        clip.addEventListener("frame", ({ currentFrame }) => {
          if (request === revision && front) {
            stage.toggleAttribute("data-front", currentFrame >= front.start && currentFrame < front.end);
          }
        });
        clip.addEventListener("loop", () => {
          if (request !== revision) return;
          if (!bag.length) {
            bag = shuffled(cast);
            if (bag.at(-1) === animal) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
          }
          animal = bag.pop();
          appear();
        });
        clip.addEventListener("loadError", () => {
          if (request === revision) stop();
        });
        const load = () => {
          if (request === revision) clip.load({ data, loop: true });
        };
        if (clip.isReady) load();
        else clip.addEventListener("ready", load);
      } catch {
        if (request === revision) stop();
      }
    }

    function sync() {
      const link = hovered || focused || home;
      const next =
        visible && !away && !document.hidden && !reduce.matches ? link.querySelector(".nav-animal") : null;
      if (next === stage) return;
      stop();
      stage = next;
      if (stage) appear();
    }

    for (const link of this.querySelectorAll("a")) {
      link.addEventListener(
        "pointerenter",
        (event) => {
          if (event.pointerType !== "touch") {
            hovered = link;
            sync();
          }
        },
        options,
      );
      link.addEventListener(
        "pointerleave",
        () => {
          hovered = null;
          sync();
        },
        options,
      );
      link.addEventListener(
        "focus",
        () => {
          if (link.matches(":focus-visible")) {
            focused = link;
            hovered = null;
            sync();
          }
        },
        options,
      );
      link.addEventListener(
        "blur",
        () => {
          focused = null;
          sync();
        },
        options,
      );
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(this.closest("nav"));
    reduce.addEventListener("change", sync, options);
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
    this.release = () => {
      controls.abort();
      observer.disconnect();
      stop();
    };
  }

  disconnectedCallback() {
    this.release?.();
  }
}

customElements.define("nav-playground", NavPlayground);
