export const HOME = Object.freeze({ latitude: 25, longitude: 42, zoom: 1 });
export const CAMERA = Object.freeze({
  globeFraction: 0.96,
  heightFraction: 0.86,
  portraitWidth: 600,
  portraitFraction: 1.23,
  minZoom: 0.8,
  maxZoom: 7,
  pinchGain: 1.9,
  dragDegrees: 90,
  maxLatitude: 89.5,
  overviewZoom: 1.25,
  countryZoom: 1.55,
  regionZoom: 2.15,
  cityZoom: 2.85,
  eventZoom: 3.4,
  idleDelay: 16000,
  idleDegreesPerSecond: 0.95,
  flyDuration: 720,
  inertiaDecay: 0.005,
});
const radians = Math.PI / 180;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const wrap = (n) => ((((n + 180) % 360) + 360) % 360) - 180;
export const radiusAt = (w, h, zoom) =>
  (Math.min(
    w * (w <= CAMERA.portraitWidth ? CAMERA.portraitFraction : CAMERA.globeFraction),
    h * CAMERA.heightFraction,
  ) *
    zoom) /
  2;

export function project(latitude, longitude, camera) {
  const north = camera.latitude * radians,
    lat = latitude * radians;
  const lon = (longitude - camera.longitude) * radians;
  const cos = Math.cos(lat),
    sin = Math.sin(lat);
  const horizontal = cos * Math.cos(lon);
  return {
    x: cos * Math.sin(lon),
    y: Math.cos(north) * sin - Math.sin(north) * horizontal,
    z: Math.sin(north) * sin + Math.cos(north) * horizontal,
  };
}

export function unproject(x, y, camera) {
  const z2 = 1 - x * x - y * y;
  if (z2 < 0) return null;
  const z = Math.sqrt(z2),
    lat = camera.latitude * radians;
  return [
    wrap(camera.longitude + Math.atan2(x, z * Math.cos(lat) - y * Math.sin(lat)) / radians),
    Math.asin(clamp(y * Math.cos(lat) + z * Math.sin(lat), -1, 1)) / radians,
  ];
}

// Solve the inverse orthographic projection for a north-up camera whose anchor
// lies at (x, y). Near a pole, use the solution nearest the current latitude.
export function holdAnchor(camera, anchor, x, y) {
  if (!anchor) return;
  const length = Math.hypot(x, y);
  if (length > 0.999) {
    x *= 0.999 / length;
    y *= 0.999 / length;
  }
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const latitude = Math.asin(clamp(Math.sin(anchor[1] * radians) / Math.hypot(y, z), -1, 1));
  const tilt = Math.atan2(y, z);
  const first = wrap((latitude - tilt) / radians);
  const second = wrap((Math.PI - latitude - tilt) / radians);
  const closest = Math.abs(second) <= 90 && Math.abs(second - camera.latitude) < Math.abs(first - camera.latitude)
    ? second : first;
  camera.latitude = clamp(closest, -CAMERA.maxLatitude, CAMERA.maxLatitude);
  const north = camera.latitude * radians;
  camera.longitude = wrap(anchor[0] - Math.atan2(x, z * Math.cos(north) - y * Math.sin(north)) / radians);
}
