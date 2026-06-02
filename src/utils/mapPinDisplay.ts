import type { Trip } from '../types/travelogue';
import type { HomeOrigin } from './flightRoutes';

/** ~110 m grouping — stacks at same coordinate open the pin picker */
const COORD_PRECISION = 3;

export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(COORD_PRECISION)}:${lng.toFixed(COORD_PRECISION)}`;
}

export function groupTripsByCoord(trips: Trip[]): Map<string, Trip[]> {
  const buckets = new Map<string, Trip[]>();
  for (const trip of trips) {
    const key = coordKey(trip.lat, trip.lng);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(trip);
    else buckets.set(key, [trip]);
  }
  return buckets;
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

export interface MapPinStack {
  key: string;
  lat: number;
  lng: number;
  /** Pin shown on the map (best representative) */
  displayTrip: Trip;
  /** All trips at this coordinate */
  trips: Trip[];
  count: number;
}

export function buildMapPinStacks(
  trips: Trip[],
  options?: { homeOrigin?: HomeOrigin | null; openTripIds?: string[] },
): MapPinStack[] {
  const openSet = new Set(options?.openTripIds ?? []);
  const home = options?.homeOrigin ?? null;
  const buckets = groupTripsByCoord(trips);

  const stacks: MapPinStack[] = [];
  for (const [key, bucket] of buckets) {
    const displayTrip = bucket.reduce((a, b) =>
      pinScore(b, openSet, home) > pinScore(a, openSet, home) ? b : a,
    );
    stacks.push({
      key,
      lat: displayTrip.lat,
      lng: displayTrip.lng,
      displayTrip,
      trips: bucket,
      count: bucket.length,
    });
  }
  return stacks;
}

/** @deprecated use buildMapPinStacks */
export function tripsForMapPins(
  trips: Trip[],
  options?: { homeOrigin?: HomeOrigin | null; openTripIds?: string[] },
): Trip[] {
  return buildMapPinStacks(trips, options).map((s) => s.displayTrip);
}
