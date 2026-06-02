import { projectCoordinates, type ProjectOptions } from './mapProjection';

export { MAP_VIEWBOX, MAP_VIEWBOX_STRING } from './mapViewBox';
export { projectCoordinates, unprojectCoordinates, type ProjectOptions } from './mapProjection';

/** Subtle bend as a fraction of chord length (0 = straight line) */
const FLIGHT_CURVE_STRENGTH = 0.035;

/**
 * Flight route in map SVG space: nearly straight with a very slight curve.
 * Routes may overlap — no lane separation.
 */
export function getFlightPath(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromOptions?: ProjectOptions,
  toOptions?: ProjectOptions,
  curveStrength = FLIGHT_CURVE_STRENGTH,
): string {
  const start = projectCoordinates(fromLat, fromLng, fromOptions);
  const end = projectCoordinates(toLat, toLng, toOptions);
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
  const bulge = len * curveStrength;
  const cx = mx + nx * bulge;
  const cy = my + ny * bulge;

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** @deprecated Use getFlightPath */
export function getGreatCirclePath(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  _laneOffset = 0,
  fromOptions?: ProjectOptions,
  toOptions?: ProjectOptions,
): string {
  return getFlightPath(fromLat, fromLng, toLat, toLng, fromOptions, toOptions);
}
