import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { travelogues, trips } from '../db/schema.js';
import { AppError, conflict, notFound } from '../lib/errors.js';
import { getMemberRole, requireRole } from './travelogue.js';

export interface TripInput {
  countryCode: string;
  cityKey?: string | null;
  name: string;
  lat: number;
  lng: number;
  description?: string | null;
  material?: 'brass' | 'copper' | null;
  startYear?: number | null;
  startMonth?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
}

function mapTripInput(input: TripInput) {
  return {
    countryCode: input.countryCode.toLowerCase(),
    cityKey: input.cityKey ?? null,
    name: input.name,
    lat: input.lat,
    lng: input.lng,
    description: input.description ?? '',
    material: input.material ?? 'brass',
    startYear: input.startYear ?? null,
    startMonth: input.startMonth ?? null,
    endYear: input.endYear ?? null,
    endMonth: input.endMonth ?? null,
  };
}

async function bumpTravelogueVersion(db: Database, travelogueId: string) {
  await db
    .update(travelogues)
    .set({
      version: sql`${travelogues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(travelogues.id, travelogueId));
}

export async function createTrip(
  db: Database,
  travelogueId: string,
  userId: string,
  input: TripInput,
) {
  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'editor');

  const [created] = await db
    .insert(trips)
    .values({
      travelogueId,
      ...mapTripInput(input),
    })
    .returning();

  if (!created) throw new AppError('Failed to create trip', 'INTERNAL', 500);
  await bumpTravelogueVersion(db, travelogueId);
  return created;
}

export async function updateTrip(
  db: Database,
  tripId: string,
  userId: string,
  baseVersion: number,
  input: TripInput,
) {
  const [existing] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)))
    .limit(1);
  if (!existing) notFound('Trip not found');

  const role = await getMemberRole(db, existing.travelogueId, userId);
  requireRole(role, 'editor');

  if (existing.version !== baseVersion) {
    conflict(`Trip version mismatch: expected ${baseVersion}, current ${existing.version}`);
  }

  const [updated] = await db
    .update(trips)
    .set({
      ...mapTripInput(input),
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(trips.id, tripId))
    .returning();

  if (!updated) throw new AppError('Failed to update trip', 'INTERNAL', 500);
  await bumpTravelogueVersion(db, existing.travelogueId);
  return updated;
}

export async function deleteTrip(
  db: Database,
  tripId: string,
  userId: string,
  baseVersion: number,
) {
  const [existing] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)))
    .limit(1);
  if (!existing) notFound('Trip not found');

  const role = await getMemberRole(db, existing.travelogueId, userId);
  requireRole(role, 'editor');

  if (existing.version !== baseVersion) {
    conflict(`Trip version mismatch: expected ${baseVersion}, current ${existing.version}`);
  }

  await db
    .update(trips)
    .set({
      deletedAt: new Date(),
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(trips.id, tripId));

  await bumpTravelogueVersion(db, existing.travelogueId);
  return {
    travelogueId: existing.travelogueId,
    tripId: existing.id,
    version: existing.version + 1,
  };
}

export async function getTripById(db: Database, tripId: string) {
  const [row] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)))
    .limit(1);
  return row ?? null;
}
