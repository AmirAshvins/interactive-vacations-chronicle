import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { syncOutbox, travelogues, trips } from '../db/schema.js';
import { AppError, forbidden, notFound } from '../lib/errors.js';
import { mapTripsToGraphql } from '../graphql/mappers.js';
import type { TripPatchPayload } from '../pubsub/travelogue.js';
import { getMemberRole, requireRole } from './travelogue.js';
import * as tripService from './trip.js';
import * as syncPublish from './syncPublish.js';

export interface ChangeInput {
  clientMutationId: string;
  type: string;
  tripId?: string | null;
  baseVersion?: number | null;
  payload?: string | null;
}

interface CreateTripPayload {
  input: tripService.TripInput;
  clientTripId?: string;
}

function parsePayload<T>(raw: string | null | undefined): T {
  if (!raw) throw new AppError('Missing change payload', 'BAD_REQUEST', 400);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AppError('Invalid change payload JSON', 'BAD_REQUEST', 400);
  }
}

async function isMutationApplied(
  db: Database,
  travelogueId: string,
  clientMutationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ appliedAt: syncOutbox.appliedAt })
    .from(syncOutbox)
    .where(
      and(
        eq(syncOutbox.travelogueId, travelogueId),
        eq(syncOutbox.clientMutationId, clientMutationId),
      ),
    )
    .limit(1);
  return Boolean(row?.appliedAt);
}

async function markMutationApplied(
  db: Database,
  travelogueId: string,
  change: ChangeInput,
): Promise<void> {
  await db
    .insert(syncOutbox)
    .values({
      travelogueId,
      clientMutationId: change.clientMutationId,
      payload: change,
      appliedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [syncOutbox.travelogueId, syncOutbox.clientMutationId],
      set: { appliedAt: new Date(), payload: change },
    });
}

export async function getSyncDelta(
  db: Database,
  travelogueId: string,
  userId: string | null,
  sinceVersion: number,
  tvTravelogueId?: string | null,
): Promise<{ travelogueVersion: number; patches: TripPatchPayload[] }> {
  if (tvTravelogueId) {
    if (tvTravelogueId !== travelogueId) forbidden();
  } else if (userId) {
    const role = await getMemberRole(db, travelogueId, userId);
    requireRole(role, 'viewer');
  } else {
    forbidden();
  }

  const [travelogue] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.id, travelogueId))
    .limit(1);
  if (!travelogue) notFound('Travelogue not found');

  if (sinceVersion >= travelogue.version) {
    return { travelogueVersion: travelogue.version, patches: [] };
  }

  const patches: TripPatchPayload[] = [];

  const activeRows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.travelogueId, travelogueId), isNull(trips.deletedAt)));

  const tripGql = await mapTripsToGraphql(db, activeRows);
  for (let i = 0; i < activeRows.length; i++) {
    const trip = activeRows[i];
    patches.push({
      op: 'UPDATED',
      tripId: trip.id,
      version: trip.version,
      trip: tripGql[i],
    });
  }

  const deletedRows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.travelogueId, travelogueId), isNotNull(trips.deletedAt)));

  for (const trip of deletedRows) {
    patches.push({
      op: 'DELETED',
      tripId: trip.id,
      version: trip.version,
    });
  }

  return { travelogueVersion: travelogue.version, patches };
}

export interface PushChangesResult {
  travelogueVersion: number;
  patches: TripPatchPayload[];
  /** Maps client-side trip ids to server ids for CREATE_TRIP mutations */
  idMappings: { clientTripId: string; serverTripId: string }[];
  conflicts: number;
}

export async function pushChanges(
  db: Database,
  travelogueId: string,
  userId: string,
  changes: ChangeInput[],
): Promise<PushChangesResult> {
  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'editor');

  const idMappings: { clientTripId: string; serverTripId: string }[] = [];
  let conflicts = 0;

  for (const change of changes) {
    if (await isMutationApplied(db, travelogueId, change.clientMutationId)) {
      continue;
    }

    try {
      switch (change.type) {
        case 'CREATE_TRIP': {
          const body = parsePayload<CreateTripPayload>(change.payload);
          const created = await tripService.createTrip(
            db,
            travelogueId,
            userId,
            body.input,
          );
          await markMutationApplied(db, travelogueId, change);
          await syncPublish.publishTripCreated(db, travelogueId, created);
          if (body.clientTripId) {
            idMappings.push({ clientTripId: body.clientTripId, serverTripId: created.id });
          }
          break;
        }
        case 'UPDATE_TRIP': {
          if (!change.tripId) throw new AppError('tripId required', 'BAD_REQUEST', 400);
          const input = parsePayload<tripService.TripInput>(change.payload);
          const baseVersion = change.baseVersion ?? 1;
          const updated = await tripService.updateTrip(
            db,
            change.tripId,
            userId,
            baseVersion,
            input,
          );
          await markMutationApplied(db, travelogueId, change);
          await syncPublish.publishTripUpdated(db, travelogueId, updated);
          break;
        }
        case 'DELETE_TRIP': {
          if (!change.tripId) throw new AppError('tripId required', 'BAD_REQUEST', 400);
          const baseVersion = change.baseVersion ?? 1;
          const deleted = await tripService.deleteTrip(
            db,
            change.tripId,
            userId,
            baseVersion,
          );
          await markMutationApplied(db, travelogueId, change);
          syncPublish.publishTripDeleted(deleted.travelogueId, deleted.tripId, deleted.version);
          break;
        }
        default:
          throw new AppError(`Unknown change type: ${change.type}`, 'BAD_REQUEST', 400);
      }
    } catch (err) {
      if (err instanceof AppError && err.code === 'CONFLICT') {
        conflicts += 1;
        await markMutationApplied(db, travelogueId, change);
        continue;
      }
      throw err;
    }
  }

  const delta = await getSyncDelta(db, travelogueId, userId, 0);
  return {
    travelogueVersion: delta.travelogueVersion,
    patches: delta.patches,
    idMappings,
    conflicts,
  };
}
