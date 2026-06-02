/**
 * Full SVG coordinate space of public/world-map.svg (plate carrée, WGS84-aligned).
 * ALL lat/lng ↔ SVG coordinate conversions must use these full dimensions.
 */
export const MAP_VIEWBOX = {
  minX: 0,
  minY: 0,
  width: 784.077,
  height: 458.627,
} as const;

/**
 * Cropped viewBox shown to the user — removes the south pole region
 * (below ~lat -57°) which contains Antarctica, the empty southern ocean,
 * and the detached Somaliland/south-island artifact.
 * minY > 0 also shifts the visible window upward so the equatorial continents
 * are centred in the viewport.
 *
 * lat -57° → y = ((90 - (-57)) / 180) * 458.627 = 406px
 * We keep ~408px of height and start at minY=0 (top stays the same).
 */
export const MAP_CROP_VIEWBOX = {
  minX: MAP_VIEWBOX.minX,
  minY: 0,
  width: MAP_VIEWBOX.width,
  height: 408,
} as const;

export const MAP_ASPECT_RATIO = MAP_CROP_VIEWBOX.width / MAP_CROP_VIEWBOX.height;

/** Minimum map size on narrow viewports — may exceed screen and enable scroll */
export const MAP_MOBILE_MIN_WIDTH = 420;
export const MAP_MOBILE_MIN_HEIGHT = MAP_MOBILE_MIN_WIDTH / MAP_ASPECT_RATIO;

/** Used as the SVG viewBox attribute — the cropped, user-visible region. */
export const MAP_VIEWBOX_STRING = `${MAP_CROP_VIEWBOX.minX} ${MAP_CROP_VIEWBOX.minY} ${MAP_CROP_VIEWBOX.width} ${MAP_CROP_VIEWBOX.height}`;
