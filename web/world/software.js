// A small software hemisphere keeps selection and camera controls available on GPU-limited devices.
export async function makeSoftwareSurface(canvas) {
  const image = new Image();
  image.src = new URL("../art/world-surface.webp", import.meta.url);
  await image.decode();
  const map = document.createElement("canvas");
  map.width = 1024;
  map.height = 512;
  const reader = map.getContext("2d", { willReadFrequently: true });
  reader.drawImage(image, 0, 0, map.width, map.height);
  const texture = reader.getImageData(0, 0, map.width, map.height).data;
  const context = canvas.getContext("2d");
  let destination;
  return {
    software: true,
    draw(width, height, radius, camera, quality) {
      const limit = quality < 1.2 ? 265 : 560;
      const scale = Math.min(1, limit / Math.max(width, height));
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
          const j = 4 * (Math.min(511, Math.floor(v * 512)) * 1024 + Math.floor(u * 1024));
          const light = 0.7 + 0.34 * Math.max(-0.45, -0.41 * x + 0.52 * y + 0.75 * z) + 0.045 * z;
          const rim = 0.44 * (1 - z) ** 5;
          out[i] = texture[j] * light * (1 - rim) + 144 * rim;
          out[i + 1] = texture[j + 1] * light * (1 - rim) + 218 * rim;
          out[i + 2] = texture[j + 2] * light * (1 - rim) + 249 * rim;
          out[i + 3] = Math.min(1, d * r * 0.67) * 255;
        }
      }
      context.putImageData(destination, 0, 0);
    },
    dispose() {
      destination = null;
      canvas.width = canvas.height = 1;
    },
  };
}
