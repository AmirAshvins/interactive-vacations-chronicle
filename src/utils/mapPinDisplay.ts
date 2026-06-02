import type { Trip } from '../types/travelogue';
import type { HomeOrigin } from './flightRoutes';

/** ~110 m grouping — collapses duplicate Toronto legs and same-city revisits on the map */
const COORD_PRECISION = 3;

export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(COORD_PRECISION)}:${lng.toFixed(COORD_PRECISION)}`;
}

function pinScore(trip: Trip, openTripIds: Set<string>, home: HomeOrigin | null): number {
  let score = 0;
  if (openTripIds.has(trip.id)) score += 1000;
  if (!trip.id.includes('toronto-')) score += 50;
  if (home) {
    const atHome =
      Math.abs(trip.lat - home.lat) < 0.06 && Math.abs(trip.lng - home.lng) < 0.06;
    if (atHome) {
      if (trip.cityKey && trip.cityKey === home.cityKey) score += 20;
      if (trip.material === 'copper') score += 10;
    }
  }
  return score;
}

/** One visible pin per map coordinate; open journal wins when several share a location. */
export function tripsForMapPins(
  trips: Trip[],
  options?: { homeOrigin?: HomeOrigin | null; openTripIds?: string[] },
): Trip[] {
  const openSet = new Set(options?.openTripIds ?? []);
  const home = options?.homeOrigin ?? null;
  const buckets = new Map<string, Trip[]>();

  for (const trip of trips) {
    const key = coordKey(trip.lat, trip.lng);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(trip);
    else buckets.set(key, [trip]);
  }

  const visible: Trip[] = [];
  for (const bucket of buckets.values()) {
    const best = bucket.reduce((a, b) =>
      pinScore(b, openSet, home) > pinScore(a, openSet, home) ? b : a,
    );
    visible.push(best);
  }
  return visible;
}
