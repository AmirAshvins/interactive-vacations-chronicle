/** ViewBox of public/world-map.svg — plate carrée base grid */
export const MAP_VIEWBOX = {
  minX: 30.767,
  minY: 241.591,
  width: 784.077,
  height: 458.627,
} as const;

export const MAP_VIEWBOX_STRING = `${MAP_VIEWBOX.minX} ${MAP_VIEWBOX.minY} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`;

/**
 * Calibrated against SVG country geometry (Simple World Map by Al MacDonald).
 * X uses equirectangular; Y blends naive + fitted slopes because the artwork
 * compresses mid-latitudes differently from a pure plate carrée grid.
 */
const Y_FITTED_SLOPE = -2.85;
const Y_FITTED_INTERCEPT = 533.804;
const Y_FITTED_LNG_THRESHOLD = -30;

function naiveY(lat: number): number {
  return ((90 - lat) / 180) * MAP_VIEWBOX.height + MAP_VIEWBOX.minY;
}

function fittedY(lat: number): number {
  return Y_FITTED_SLOPE * lat + Y_FITTED_INTERCEPT;
}

function useFittedY(lat: number, lng: number): boolean {
  return lng > Y_FITTED_LNG_THRESHOLD || lat < 0;
}

/** Project WGS84 lat/lng to SVG user units matching world-map.svg */
export function projectCoordinates(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * MAP_VIEWBOX.width + MAP_VIEWBOX.minX,
    y: useFittedY(lat, lng) ? fittedY(lat) : naiveY(lat),
  };
}

/** Inverse of projectCoordinates (approximate for hybrid Y) */
export function unprojectCoordinates(x: number, y: number): { lat: number; lng: number } {
  const lng = ((x - MAP_VIEWBOX.minX) / MAP_VIEWBOX.width) * 360 - 180;
  const lat =
    lng > Y_FITTED_LNG_THRESHOLD
      ? (Y_FITTED_INTERCEPT - y) / -Y_FITTED_SLOPE
      : 90 - ((y - MAP_VIEWBOX.minY) / MAP_VIEWBOX.height) * 180;
  return { lat, lng };
}

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

/** Spherical interpolation between two lat/lng points */
function interpolateGreatCircle(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  t: number,
): { lat: number; lng: number } {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lng1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lng2);

  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  const dot = x1 * x2 + y1 * y2 + z1 * z2;
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
  if (omega < 1e-6) {
    return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
  }

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;

  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

/** Great-circle route as SVG path (stroke only — never fill) */
export function getGreatCirclePath(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  laneOffset = 0,
  steps = 48,
): string {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { lat, lng } = interpolateGreatCircle(fromLat, fromLng, toLat, toLng, t);
    points.push(projectCoordinates(lat, lng));
  }

  // Slight perpendicular lane offset for overlapping routes
  if (laneOffset !== 0 && points.length > 2) {
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const next = points[i + 1];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      points[i] = {
        x: points[i].x + (-dy / len) * laneOffset,
        y: points[i].y + (dx / len) * laneOffset,
      };
    }
  }

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}
