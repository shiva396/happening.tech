// Inverse orthographic sampling keeps the physical map and the selectable country paths aligned.
export async function paintEarth(canvas) {
  const source = new Image();
  source.src = "/art/earth-relief.webp";
  await source.decode();
  const raster = document.createElement("canvas");
  raster.width = source.width;
  raster.height = source.height;
  const reader = raster.getContext("2d", { willReadFrequently: true });
  reader.drawImage(source, 0, 0);
  const pixels = new Uint32Array(reader.getImageData(0, 0, raster.width, raster.height).data.buffer);
  const surface = canvas.getContext("2d");
  const grids = new Map();
  const radians = Math.PI / 180;
  let settle;
  function grid(size) {
    if (grids.has(size)) return grids.get(size);
    const image = surface.createImageData(size, size);
    const depth = new Float32Array(size * size);
    for (let row = 0; row < size; row++) {
      const y = 1 - ((row + 0.5) * 2) / size;
      for (let col = 0; col < size; col++) {
        const x = ((col + 0.5) * 2) / size - 1;
        const z2 = 1 - x * x - y * y;
        depth[row * size + col] = z2 > 0 ? Math.sqrt(z2) : -1;
      }
    }
    const result = { image, depth, output: new Uint32Array(image.data.buffer) };
    grids.set(size, result);
    return result;
  }
  function render(lon, lat, size) {
    const { image, depth, output } = grid(size);
    const sin = Math.sin(lat * radians),
      cos = Math.cos(lat * radians);
    const width = raster.width,
      height = raster.height;
    const meridian = (lon / 360 + 1.5) * width;
    let index = 0;
    for (let row = 0; row < size; row++) {
      const y = 1 - ((row + 0.5) * 2) / size;
      for (let col = 0; col < size; col++, index++) {
        const z = depth[index];
        if (z < 0) continue;
        const x = ((col + 0.5) * 2) / size - 1;
        const u = Math.floor(meridian + (Math.atan2(x, z * cos - y * sin) * width) / (2 * Math.PI)) % width;
        const v = Math.floor(
          (0.5 - Math.asin(Math.max(-1, Math.min(1, y * cos + z * sin))) / Math.PI) * height,
        );
        output[index] = pixels[Math.min(v, height - 1) * width + u];
      }
    }
    if (canvas.width !== size) canvas.width = canvas.height = size;
    surface.putImageData(image, 0, 0);
  }
  return (lon, lat) => {
    clearTimeout(settle);
    render(lon, lat, 256);
    settle = setTimeout(() => render(lon, lat, 640), 100);
  };
}
