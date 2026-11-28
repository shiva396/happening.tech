// Country lookup is loaded only after a land tap.
import { feature } from "../vendor/globe/geo.js";

let geography;
async function countryFeatures() {
  const response = await fetch(new URL("../art/countries.json", import.meta.url));
  if (!response.ok) throw new Error("Country geometry unavailable");
  const topo = await response.json();
  return feature(topo, topo.objects.countries).features.flatMap((country) => {
    const geo = country.geometry;
    const polygons = geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates;
    const name =
      country.properties.name === "United States of America" ? "United States" : country.properties.name;
    return polygons.map((rings) => ({ name, rings: rings.map(unwrapRing) }));
  });
}

function unwrapRing(ring) {
  let previous = ring[0][0];
  const points = ring.map(([lon, lat]) => {
    previous = lon + 360 * Math.round((previous - lon) / 360);
    return [previous, lat];
  });
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  if (Math.abs(points.at(-1)[0] - points[0][0]) > 180) {
    points.push([points.at(-1)[0], -90], [points[0][0], -90]);
    ys.push(-90);
  }
  return {
    points,
    west: Math.min(...xs),
    east: Math.max(...xs),
    south: Math.min(...ys),
    north: Math.max(...ys),
  };
}

function contains(ring, longitude, lat) {
  if (lat < ring.south || lat > ring.north) return false;
  const x = longitude + 360 * Math.round(((ring.west + ring.east) / 2 - longitude) / 360);
  if (x < ring.west || x > ring.east) return false;
  let inside = false;
  const p = ring.points;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, ay] = p[i],
      [bx, by] = p[j];
    if (ay > lat !== by > lat && x < ((bx - ax) * (lat - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export async function countryAt(lon, lat) {
  geography ??= countryFeatures().catch((error) => {
    geography = undefined;
    throw error;
  });
  const entries = await geography;
  for (const { name, rings } of entries) {
    if (contains(rings[0], lon, lat) && !rings.slice(1).some((ring) => contains(ring, lon, lat))) return name;
  }
  return null;
}
