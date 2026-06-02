import type { Database } from '../db/index.js';
import type { trips as tripsTable } from '../db/schema.js';
import { getAttachedImageUrlsForTrip, getAttachedImageUrlsForTrips } from '../services/images.js';

type TripRow = typeof tripsTable.$inferSelect;

export async function mapTripToGraphql(db: Database, trip: TripRow) {
  const imageUrls = await getAttachedImageUrlsForTrip(db, trip.id);
  return {
    id: trip.id,
    countryCode: trip.countryCode,
    cityKey: trip.cityKey,
    name: trip.name,
    lat: trip.lat,
    lng: trip.lng,
    description: trip.description,
    material: trip.material as 'brass' | 'copper',
    startYear: trip.startYear,
    startMonth: trip.startMonth,
    endYear: trip.endYear,
    endMonth: trip.endMonth,
    version: trip.version,
    imageUrls,
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export async function mapTripsToGraphql(db: Database, tripRows: TripRow[]) {
  const urlsByTrip = await getAttachedImageUrlsForTrips(
    db,
    tripRows.map((t) => t.id),
  );
  return tripRows.map((trip) => ({
    id: trip.id,
    countryCode: trip.countryCode,
    cityKey: trip.cityKey,
    name: trip.name,
    lat: trip.lat,
    lng: trip.lng,
    description: trip.description,
    material: trip.material as 'brass' | 'copper',
    startYear: trip.startYear,
    startMonth: trip.startMonth,
    endYear: trip.endYear,
    endMonth: trip.endMonth,
    version: trip.version,
    imageUrls: urlsByTrip.get(trip.id) ?? [],
    updatedAt: trip.updatedAt.toISOString(),
  }));
}

export function mapTravelogueToGraphql(
  travelogue: {
    id: string;
    name: string;
    homeCityKey: string;
    mapSettings: { showFlightPaths: boolean; highlightVisited: boolean };
    version: number;
    updatedAt: Date;
  },
  tripGql: Awaited<ReturnType<typeof mapTripsToGraphql>>,
) {
  return {
    id: travelogue.id,
    name: travelogue.name,
    homeCityKey: travelogue.homeCityKey,
    mapSettings: travelogue.mapSettings,
    version: travelogue.version,
    trips: tripGql,
    updatedAt: travelogue.updatedAt.toISOString(),
  };
}

export function mapUserToGraphql(user: {
  id: string;
  email: string;
  displayName: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export function mapTravelogueSummaryToGraphql(summary: {
  id: string;
  name: string;
  role: string;
  tripCount: number;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: summary.id,
    name: summary.name,
    role: summary.role,
    tripCount: summary.tripCount,
    version: summary.version,
    updatedAt: summary.updatedAt.toISOString(),
  };
}
