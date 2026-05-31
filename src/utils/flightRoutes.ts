import type { FlightRoute, Trip } from '../types/travelogue';
import { findCityById } from '../data/worldCities';

export const HOME_ORIGIN_ID = '__home__';

const LANE_SEPARATION = 10;
const SAME_LOCATION_THRESHOLD = 0.08;

export interface HomeOrigin {
  cityKey: string;
  name: string;
  lat: number;
  lng: number;
}

export function getHomeOrigin(homeCityKey: string): HomeOrigin | null {
  const city = findCityById(homeCityKey);
  if (!city) return null;
  return {
    cityKey: city.id,
    name: city.name,
    lat: city.lat,
    lng: city.lng,
  };
}

function isAtHome(trip: Trip, home: HomeOrigin): boolean {
  if (trip.cityKey && trip.cityKey === home.cityKey) return true;
  return (
    Math.abs(trip.lat - home.lat) < SAME_LOCATION_THRESHOLD &&
    Math.abs(trip.lng - home.lng) < SAME_LOCATION_THRESHOLD
  );
}

/** One arc per journal entry: home origin → destination. */
export function deriveJournalFlights(homeCityKey: string, trips: Trip[]): FlightRoute[] {
  const home = getHomeOrigin(homeCityKey);
  if (!home) return [];

  return trips
    .filter((trip) => !isAtHome(trip, home))
    .map((trip) => ({
      id: `f-home-${trip.id}`,
      fromTripId: HOME_ORIGIN_ID,
      toTripId: trip.id,
    }));
}

/** Offset parallel arcs — bidirectional pairs split to opposite sides */
export function computeFlightLaneOffset(flight: FlightRoute, flights: FlightRoute[], index: number): number {
  const sameDirectionBefore = flights.slice(0, index).filter(
    (f) => f.fromTripId === flight.fromTripId && f.toTripId === flight.toTripId,
  ).length;

  const hasReverse = flights.some(
    (f) => f.fromTripId === flight.toTripId && f.toTripId === flight.fromTripId,
  );

  if (!hasReverse) {
    return sameDirectionBefore * LANE_SEPARATION;
  }

  const [canonicalFrom] = [flight.fromTripId, flight.toTripId].sort();
  const side = flight.fromTripId === canonicalFrom ? 1 : -1;
  return side * (LANE_SEPARATION + sameDirectionBefore * LANE_SEPARATION);
}

export function resolveFlightEndpoints(
  flight: FlightRoute,
  trips: { id: string; lat: number; lng: number }[],
  homeOrigin: HomeOrigin | null,
): { fromLat: number; fromLng: number; toLat: number; toLng: number } | null {
  const to = trips.find((t) => t.id === flight.toTripId);
  if (!to) return null;

  if (flight.fromTripId === HOME_ORIGIN_ID) {
    if (!homeOrigin) return null;
    return {
      fromLat: homeOrigin.lat,
      fromLng: homeOrigin.lng,
      toLat: to.lat,
      toLng: to.lng,
    };
  }

  const from = trips.find((t) => t.id === flight.fromTripId);
  if (!from) return null;
  return {
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: to.lat,
    toLng: to.lng,
  };
}
