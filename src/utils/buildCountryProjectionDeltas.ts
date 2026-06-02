import { COUNTRY_GEO_CENTERS } from '../data/countryGeoCenters';
import { projectCoordinatesEquirectangular, type CountryProjectionDelta } from './mapProjection';

/** Measure SVG vs base projection offset per country from rendered path geometry. */
export function buildCountryProjectionDeltas(
  mapSvg: SVGSVGElement,
): Map<string, CountryProjectionDelta> {
  const deltas = new Map<string, CountryProjectionDelta>();

  for (const el of mapSvg.querySelectorAll<SVGGraphicsElement>('[id]')) {
    const id = el.id.toLowerCase();
    const geo = COUNTRY_GEO_CENTERS[id];
    if (!geo) continue;

    try {
      const box = el.getBBox();
      if (box.width <= 0 || box.height <= 0) continue;

      const svgX = box.x + box.width / 2;
      const svgY = box.y + box.height / 2;
      const base = projectCoordinatesEquirectangular(geo[0], geo[1]);

      deltas.set(id, {
        dx: svgX - base.x,
        dy: svgY - base.y,
        lat: geo[0],
        lng: geo[1],
      });
    } catch {
      /* not yet laid out */
    }
  }

  return deltas;
}
