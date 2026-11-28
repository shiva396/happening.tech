// A bounded set of local 1:10m map tiles supplements the overview in both renderers.
import { unproject } from "./camera.js";

export const TILES = Object.freeze({ columns: 16, rows: 8, size: 768, zoom: 1.25 });

function visibleTiles(width, height, radius, view, capacity) {
  const nearest = new Map();
  // Sample the visible hemisphere in screen space so longitude wraps at the date line
  // and polar views select tiles on both sides of the pole.
  for (let row = -6; row <= 6; row++) {
    for (let col = -9; col <= 9; col++) {
      const x = col * width / 18, y = row * height / 12;
      const geo = unproject(x / radius, y / radius, view);
      if (!geo) continue;
      const tx = Math.floor(((geo[0] + 180) / 360) * TILES.columns) % TILES.columns;
      const ty = Math.min(TILES.rows - 1, Math.floor(((90 - geo[1]) / 180) * TILES.rows));
      const id = ty * TILES.columns + tx;
      const distance = x * x + y * y;
      nearest.set(id, Math.min(nearest.get(id) ?? Infinity, distance));
    }
  }
  return [...nearest.keys()].sort((a, b) => nearest.get(a) - nearest.get(b)).slice(0, capacity);
}

// The lookup stores slot + 1. A missing tile always samples the overview.
export function detailCache(capacity, upload, redraw) {
  const lookup = new Uint8Array(TILES.columns * TILES.rows);
  const slots = Array(capacity).fill(-1);
  const pending = new Map(), failedUntil = new Map();
  let wanted = [], lastView = "", lastCheck = -Infinity, disposed = false;
  let settled, release;
  function fill() {
    if (disposed) return;
    for (const id of wanted) {
      if (pending.size >= 3) break;
      if (lookup[id] || pending.has(id) || (failedUntil.get(id) || 0) > performance.now()) continue;
      const image = new Image();
      pending.set(id, image);
      image.src = new URL("../art/world-detail/" + id + ".webp", import.meta.url).href;
      image.decode().then(async () => {
        // Decode ahead of the camera, but keep GPU uploads out of gesture and flight frames.
        if (settled) await settled;
        if (disposed || !wanted.includes(id)) return;
        if (image.naturalWidth !== TILES.size || image.naturalHeight !== TILES.size) throw Error("Invalid detail tile");
        let slot = slots.indexOf(-1);
        if (slot < 0) slot = slots.findIndex((other) => !wanted.includes(other));
        if (slot < 0) return;
        const old = slots[slot];
        if (old >= 0) lookup[old] = 0;
        lookup[id] = slot + 1;
        try {
          upload(slot, image, lookup);
        } catch (error) {
          lookup[id] = 0;
          if (old >= 0) lookup[old] = slot + 1;
          throw error;
        }
        slots[slot] = id;
        redraw();
      }).catch(() => {
        failedUntil.set(id, performance.now() + 30000);
      }).finally(() => {
        pending.delete(id);
        fill();
      });
    }
  }
  return {
    lookup,
    update(width, height, radius, view, moving, zoom) {
      if (disposed) return;
      if (moving && zoom >= TILES.zoom) {
        settled ??= new Promise(resolve => { release = resolve; });
      } else if (settled) {
        release();
        settled = release = null;
      }
      if (zoom < TILES.zoom) {
        wanted = [];
        lastView = "";
        return;
      }
      const key = [width, height, radius.toFixed(1), view.longitude.toFixed(2), view.latitude.toFixed(2)].join("/");
      const now = performance.now();
      if (key === lastView || (moving && now - lastCheck < 160)) return;
      lastView = key;
      lastCheck = now;
      wanted = visibleTiles(width, height, radius, view, capacity);
      fill();
    },
    dispose() {
      disposed = true;
      release?.();
      for (const image of pending.values()) image.removeAttribute("src");
      pending.clear();
    },
  };
}
