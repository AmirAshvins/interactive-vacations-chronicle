import { MAP_VIEWBOX, MAP_VIEWBOX_STRING } from './mapViewBox';

export { MAP_VIEWBOX, MAP_VIEWBOX_STRING };

/** Map WGS84 lat/lng to SVG user units (plate carrée, matches build-world-map-svg.mjs). */
export function projectCoordinates(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * MAP_VIEWBOX.width + MAP_VIEWBOX.minX,
    y: ((90 - lat) / 180) * MAP_VIEWBOX.height + MAP_VIEWBOX.minY,
  };
}

export function unprojectCoordinates(x: number, y: number): { lat: number; lng: number } {
  const lng =
    ((x - MAP_VIEWBOX.minX) / MAP_VIEWBOX.width) * 360 - 180;
  const lat =
    90 - ((y - MAP_VIEWBOX.minY) / MAP_VIEWBOX.height) * 180;
  return { lat, lng };
}
