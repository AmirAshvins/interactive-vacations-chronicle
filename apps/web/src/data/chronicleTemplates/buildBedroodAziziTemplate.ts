import type { Trip } from '../../types/travelogue';
import {
  BEDROOD_COUNTRY_ROUTES,
  TORONTO_HOME,
  type RouteCity,
} from './bedroodAziziRoutes';

function tripFromCity(
  id: string,
  city: RouteCity,
  material: 'brass' | 'copper',
  startYear: number,
  startMonth: number,
  description: string,
): Trip {
  return {
    id,
    name: city.name,
    countryCode: city.countryCode,
    cityKey: city.cityKey,
    lat: city.lat,
    lng: city.lng,
    description,
    material,
    startYear,
    startMonth,
    imageIds: [],
  };
}

/** Builds chronicle trips: Toronto → country cities → Toronto for each segment. */
export function buildBedroodAziziTrips(): Trip[] {
  const trips: Trip[] = [];
  let year = 2015;
  let month = 1;
  let material: 'brass' | 'copper' = 'copper';

  const bumpMonth = () => {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  };

  const addToronto = (segmentKey: string, segmentLabel: string, leg: 'outbound' | 'return') => {
    const id = `bedrood-toronto-${segmentKey}-${leg}`;
    trips.push(
      tripFromCity(
        id,
        TORONTO_HOME,
        material,
        year,
        month,
        leg === 'outbound'
          ? `Home — flying out from Toronto toward ${segmentLabel}.`
          : `Home again — back in Toronto after ${segmentLabel}.`,
      ),
    );
    material = material === 'brass' ? 'copper' : 'brass';
    bumpMonth();
  };

  const addCity = (segmentKey: string, segmentLabel: string, city: RouteCity) => {
    const id = `bedrood-${segmentKey}-${city.slug}`;
    trips.push(
      tripFromCity(
        id,
        city,
        material,
        year,
        month,
        `Family chapter in ${city.name} — part of our ${segmentLabel} journey.`,
      ),
    );
    material = material === 'brass' ? 'copper' : 'brass';
    bumpMonth();
  };

  for (let i = 0; i < BEDROOD_COUNTRY_ROUTES.length; i++) {
    const route = BEDROOD_COUNTRY_ROUTES[i];
    const segmentKey =
      route.segmentKey ??
      `${route.label.toLowerCase().replace(/\s+/g, '-')}-${i}`;
    addToronto(segmentKey, route.label, 'outbound');
    for (const city of route.cities) {
      addCity(segmentKey, route.label, city);
    }
    addToronto(segmentKey, route.label, 'return');
  }

  return trips;
}
