import { resolveMapPinNudge } from '../data/mapPinNudges';
import { MAP_VIEWBOX, MAP_VIEWBOX_STRING } from './mapViewBox';

export { MAP_VIEWBOX, MAP_VIEWBOX_STRING };

export interface ProjectOptions {
  countryCode?: string;
  cityKey?: string;
  pinId?: string;
}

export interface CountryProjectionDelta {
  dx: number;
  dy: number;
  lat: number;
  lng: number;
}

const Y_FITTED_SLOPE = -2.85;
const Y_FITTED_INTERCEPT = 533.804;
const Y_FITTED_LNG_THRESHOLD = -30;

let countryDeltas: Map<string, CountryProjectionDelta> | null = null;

function naiveY(lat: number): number {
  return ((90 - lat) / 180) * MAP_VIEWBOX.height + MAP_VIEWBOX.minY;
}

function fittedY(lat: number): number {
  return Y_FITTED_SLOPE * lat + Y_FITTED_INTERCEPT;
}

function useFittedY(lat: number, lng: number): boolean {
  return lng > Y_FITTED_LNG_THRESHOLD || lat < 0;
}

export function projectCoordinatesEquirectangular(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * MAP_VIEWBOX.width + MAP_VIEWBOX.minX,
    y: useFittedY(lat, lng) ? fittedY(lat) : naiveY(lat),
  };
}

export function unprojectCoordinatesEquirectangular(x: number, y: number): { lat: number; lng: number } {
  const lng = ((x - MAP_VIEWBOX.minX) / MAP_VIEWBOX.width) * 360 - 180;
  const lat =
    lng > Y_FITTED_LNG_THRESHOLD
      ? (Y_FITTED_INTERCEPT - y) / -Y_FITTED_SLOPE
      : 90 - ((y - MAP_VIEWBOX.minY) / MAP_VIEWBOX.height) * 180;
  return { lat, lng };
}

export function setCountryProjectionDeltas(deltas: Map<string, CountryProjectionDelta>): void {
  countryDeltas = deltas.size > 0 ? deltas : null;
}

export function clearCountryProjectionDeltas(): void {
  countryDeltas = null;
}

function geoDistanceDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const cosMid = Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dLng = (lng1 - lng2) * cosMid;
  return Math.hypot(dLat, dLng);
}

function resolveCountryDelta(
  countryCode: string | undefined,
  lat: number,
  lng: number,
): { dx: number; dy: number } {
  if (!countryDeltas || !countryCode) return { dx: 0, dy: 0 };

  const code = countryCode.toLowerCase();
  const direct = countryDeltas.get(code);
  if (direct) return { dx: direct.dx, dy: direct.dy };

  // Nearest-country blend for territories / missing ids
  let weightSum = 0;
  let dx = 0;
  let dy = 0;
  const samples = [...countryDeltas.entries()]
    .map(([, d]) => ({
      d,
      dist: geoDistanceDeg(lat, lng, d.lat, d.lng),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4);

  for (const { d, dist } of samples) {
    const w = 1 / Math.pow(Math.max(dist, 0.35), 2);
    weightSum += w;
    dx += w * d.dx;
    dy += w * d.dy;
  }

  if (weightSum === 0) return { dx: 0, dy: 0 };
  return { dx: dx / weightSum, dy: dy / weightSum };
}

/** Map WGS84 lat/lng to SVG user units matching world-map.svg */
export function projectCoordinates(
  lat: number,
  lng: number,
  options?: ProjectOptions,
): { x: number; y: number } {
  const base = projectCoordinatesEquirectangular(lat, lng);
  const { dx, dy } = resolveCountryDelta(options?.countryCode, lat, lng);
  const nudge = resolveMapPinNudge(options?.cityKey, options?.pinId);

  return {
    x: base.x + dx + (nudge?.dx ?? 0),
    y: base.y + dy + (nudge?.dy ?? 0),
  };
}

export function unprojectCoordinates(
  x: number,
  y: number,
  options?: ProjectOptions,
): { lat: number; lng: number } {
  const nudge = resolveMapPinNudge(options?.cityKey, options?.pinId);
  const sx = x - (nudge?.dx ?? 0);
  const sy = y - (nudge?.dy ?? 0);

  const rough = unprojectCoordinatesEquirectangular(sx, sy);
  const { dx, dy } = resolveCountryDelta(options?.countryCode, rough.lat, rough.lng);

  return unprojectCoordinatesEquirectangular(sx - dx, sy - dy);
}
