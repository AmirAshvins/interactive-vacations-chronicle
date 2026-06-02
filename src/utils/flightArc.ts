import { projectCoordinates } from './mapProjection';

export { MAP_VIEWBOX, MAP_VIEWBOX_STRING } from './mapViewBox';
export { projectCoordinates, unprojectCoordinates } from './mapProjection';

/** Bulge as a fraction of chord length — scales up on long hauls */
const FLIGHT_CURVE_MIN = 0.06;
const FLIGHT_CURVE_MAX = 0.14;
const FLIGHT_CURVE_RAMP_LEN = 300;

export interface FlightDashStyle {
  strokeDasharray: string;
  strokeDashoffset: number;
  opacity: number;
}

/** Deterministic 0..1 samples from a flight id (stable across reloads) */
function flightHashSamples(flightId: string): [number, number, number, number] {
  let h = 2166136261;
  for (let i = 0; i < flightId.length; i++) {
    h ^= flightId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r0 = (h & 0xff) / 255;
  const r1 = ((h >>> 8) & 0xff) / 255;
  const r2 = ((h >>> 16) & 0xff) / 255;
  const r3 = ((h >>> 24) & 0xff) / 255;
  return [r0, r1, r2, r3];
}

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
    return flightHashSamples(flightId)[0] < 0.5 ? -1 : 1;
  }
  const v =
    Math.sin((fromLng + toLng) * 0.017) * Math.cos((fromLat + toLat) * 0.023);
  return v >= 0 ? 1 : -1;
}

/**
 * Per-route dash rhythm + phase offset so parallel hub routes do not line up
 * into a solid "barcode" when many flights overlap.
 */
export function getFlightDashStyle(flightId: string, denseLayer: boolean): FlightDashStyle {
  const [r0, r1, r2, r3] = flightHashSamples(flightId);
  const dash = 3.2 + r0 * 3.4;
  const gap = 4.5 + r1 * 4.5;
  const pitch = dash + gap;
  const strokeDashoffset = (r2 + r3 * 0.37) * pitch;

  const opacity = denseLayer ? 0.26 + r0 * 0.28 : 0.52 + r1 * 0.18;

  return {
    strokeDasharray: `${dash.toFixed(2)} ${gap.toFixed(2)}`,
    strokeDashoffset: Number(strokeDashoffset.toFixed(2)),
    opacity: Number(opacity.toFixed(3)),
  };
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
  const bulgeJitter = flightId ? 0.82 + flightHashSamples(flightId)[2] * 0.36 : 1;
  const bulge = len * curveStrengthForLength(len) * sign * bulgeJitter;
  const cx = mx + nx * bulge;
  const cy = my + ny * bulge;

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

