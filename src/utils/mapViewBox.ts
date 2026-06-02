/** ViewBox of public/world-map.svg (equirectangular, WGS84-aligned) */
export const MAP_VIEWBOX = {
  minX: 0,
  minY: 0,
  width: 784.077,
  height: 458.627,
} as const;

export const MAP_VIEWBOX_STRING = `${MAP_VIEWBOX.minX} ${MAP_VIEWBOX.minY} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`;
