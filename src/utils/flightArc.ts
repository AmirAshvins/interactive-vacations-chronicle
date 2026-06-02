import { projectCoordinates } from './mapProjection';

export { MAP_VIEWBOX, MAP_VIEWBOX_STRING } from './mapViewBox';
export { projectCoordinates, unprojectCoordinates } from './mapProjection';

/** Bulge as a fraction of chord length — scales up on long hauls */
const FLIGHT_CURVE_MIN = 0.06;
const FLIGHT_CURVE_MAX = 0.14;
const FLIGHT_CURVE_RAMP_LEN = 300;

function curveStrengthForLength(len: number): number {
  const t = Math.min(1, len / FLIGHT_CURVE_RAMP_LEN);
  return FLIGHT_CURVE_MIN + t * (FLIGHT_CURVE_MAX - FLIGHT_CURVE_MIN);
}

/** Stable ±1 so overlapping routes bend opposite ways */
function curveSign(
  flightId: string | undefined,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  if (flightId) {
    let hash = 0;
    for (let i = 0; i < flightId.length; i++) {
      hash = (hash + flightId.charCodeAt(i) * (i + 3)) | 0;
    }
    return hash % 2 === 0 ? 1 : -1;
  }
  const v =
    Math.sin((fromLng + toLng) * 0.017) * Math.cos((fromLat + toLat) * 0.023);
  return v >= 0 ? 1 : -1;
}

/**
 * Flight route in map SVG space: a visible quadratic arc (great-circle feel on the flat map).
 * Bulge direction varies per route so paths from the same hub do not look identical.
 */
export function getFlightPath(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  flightId?: string,
): string {
  const start = projectCoordinates(fromLat, fromLng);
  const end = projectCoordinates(toLat, toLng);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) {
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const nx = -dy / len;
  const ny = dx / len;
  const sign = curveSign(flightId, fromLat, fromLng, toLat, toLng);
  const bulge = len * curveStrengthForLength(len) * sign;
  const cx = mx + nx * bulge;
  const cy = my + ny * bulge;

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

