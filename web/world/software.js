import { loadOverview } from "./surface.js";
import { detailCache, TILES, FINE_OFFSET } from "./detail.js";

// A small software hemisphere keeps selection and camera controls available on GPU-limited devices.
export async function makeSoftwareSurface(canvas, redraw) {
  const image = await loadOverview();
  const map = document.createElement("canvas");
  map.width = Math.min(2048, image.naturalWidth);
  map.height = map.width / 2;
  const reader = map.getContext("2d", { willReadFrequently: true });
  reader.drawImage(image, 0, 0, map.width, map.height);
  const texture = reader.getImageData(0, 0, map.width, map.height).data;
  const context = canvas.getContext("2d");
  const baseWidth = map.width, baseHeight = map.height;
  map.width = map.height = TILES.size;
  const tiles = [];
  let repaint, destination;
  const details = detailCache(12, (slot, image) => {
    reader.drawImage(image, 0, 0);
    tiles[slot] = reader.getImageData(0, 0, TILES.size, TILES.size).data;
  }, () => {
    // Coalesce arrivals into one full-resolution software projection.
    clearTimeout(repaint);
    repaint = setTimeout(redraw, 70);
  });
  return {
    software: true,
    draw(width, height, radius, camera, moving, quality, sceneScale, readerRadius) {
      const zoom = camera.zoom * sceneScale;
      details.update(width / sceneScale, height / sceneScale, radius, camera, moving, zoom, readerRadius / sceneScale);
      const scale = moving
        ? Math.min(1, 430 / Math.max(width, height))
        : Math.min((window.devicePixelRatio || 1) * sceneScale, 2, Math.sqrt(1600000 / (width * height)));
      const detailed = zoom >= TILES.zoom, fine = zoom >= TILES.fineZoom;
      const w = Math.max(1, Math.round(width * scale)),
        h = Math.max(1, Math.round(height * scale));
      if (!destination || canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        destination = context.createImageData(w, h);
      }
      const sin = Math.sin((camera.latitude * Math.PI) / 180),
        cos = Math.cos((camera.latitude * Math.PI) / 180);
      const out = destination.data,
        r = radius * scale;
      for (let row = 0, i = 0; row < h; row++) {
        const y = (h / 2 - row - 0.5) / r;
        for (let col = 0; col < w; col++, i += 4) {
          const x = (col + 0.5 - w / 2) / r,
            d = 1 - x * x - y * y;
          if (d <= 0) {
            out[i + 3] = 0;
            continue;
          }
          const z = Math.sqrt(d);
          const u = (Math.atan2(x, z * cos - y * sin) / (2 * Math.PI) + camera.longitude / 360 + 1.5) % 1;
          const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, y * cos + z * sin))) / Math.PI;
          let pixels = texture, sw = baseWidth, sh = baseHeight, sx = u, sy = v;
          if (detailed) {
            let tx = u * TILES.columns, ty = Math.min(v * TILES.rows, TILES.rows - 1e-7);
            let slot = fine && details.lookup[FINE_OFFSET + Math.floor(ty * 2) * TILES.columns * 2 + Math.floor(tx * 2)];
            if (slot) {
              tx *= 2;
              ty *= 2;
            } else {
              slot = details.lookup[Math.floor(ty) * TILES.columns + Math.floor(tx)];
            }
            if (slot) {
              pixels = tiles[slot - 1];
              sw = sh = TILES.size;
              sx = tx - Math.floor(tx);
              sy = ty - Math.floor(ty);
            }
          }
          const j = 4 * (Math.min(sh - 1, Math.floor(sy * sh)) * sw + Math.min(sw - 1, Math.floor(sx * sw)));
          const light = 0.89 + 0.16 * Math.max(-0.5, -0.41 * x + 0.52 * y + 0.75 * z);
          const rim = 0.33 * (1 - z) ** 6;
          out[i] = pixels[j] * light * (1 - rim) + 117 * rim;
          out[i + 1] = pixels[j + 1] * light * (1 - rim) + 180 * rim;
          out[i + 2] = pixels[j + 2] * light * (1 - rim) + 235 * rim;
          out[i + 3] = Math.min(1, d * r * 0.67) * 255;
        }
      }
      context.putImageData(destination, 0, 0);
    },
    dispose() {
      clearTimeout(repaint);
      details.dispose();
      tiles.length = 0;
      destination = null;
      canvas.width = canvas.height = 1;
    },
  };
}
