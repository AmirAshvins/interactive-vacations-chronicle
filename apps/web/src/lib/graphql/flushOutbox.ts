import type { Trip } from '../../types/travelogue';
import {
  listOutbox,
  removeOutboxEntries,
  remapCachedTripId,
  setSyncMeta,
  type OutboxEntry,
} from '../../db/syncDb';
import { getOutboxBlob } from '../../db/syncDb';
import { gqlRequest } from './client';
import { PUSH_CHANGES } from './operations';
import { applySyncDeltaToTrips, type SyncDeltaResponse } from './applySyncDelta';
import { serverTripToTripWithCache } from './mappers';
import { uploadTripImage } from './uploadTripImages';
import { isServerImageId } from './imageUrls';

export interface FlushOutboxResult {
  trips: Trip[];
  travelogueVersion: number;
  conflicts: number;
}

export async function flushOutbox(
  travelogueId: string,
  accessToken: string,
  currentTrips: Trip[],
): Promise<FlushOutboxResult | null> {
  const entries = await listOutbox(travelogueId);
  if (!entries.length) return null;

  const changes = entries.map(outboxEntryToChangeInput);
  const data = await gqlRequest<{
    pushChanges: SyncDeltaResponse & {
      idMappings: { clientTripId: string; serverTripId: string }[];
      conflicts: number;
    };
  }>(PUSH_CHANGES, { travelogueId, changes }, accessToken);

  let trips = currentTrips;

  for (const mapping of data.pushChanges.idMappings) {
    trips = trips.map((t) =>
      t.id === mapping.clientTripId ? { ...t, id: mapping.serverTripId } : t,
    );
    await remapCachedTripId(travelogueId, mapping.clientTripId, mapping.serverTripId);
  }

  for (const entry of entries) {
    if (entry.type !== 'CREATE_TRIP' || !entry.pendingImageBlobIds.length) continue;
    const tripId =
      data.pushChanges.idMappings.find((m) => {
        try {
          const payload = JSON.parse(entry.payload ?? '{}') as { clientTripId?: string };
          return payload.clientTripId === m.clientTripId;
        } catch {
          return false;
        }
      })?.serverTripId ?? entry.tripId;

    if (!tripId || !isServerImageId(tripId)) continue;

    for (const blobId of entry.pendingImageBlobIds) {
      const blob = await getOutboxBlob(blobId);
      if (blob) {
        const serverTrip = await uploadTripImage(accessToken, tripId, blob);
        const updated = await serverTripToTripWithCache(serverTrip);
        trips = trips.map((t) => (t.id === tripId ? updated : t));
      }
    }
  }

  trips = applySyncDeltaToTrips(trips, data.pushChanges);

  await removeOutboxEntries(entries.map((e) => e.clientMutationId));
  await setSyncMeta({
    travelogueId,
    serverVersion: data.pushChanges.travelogueVersion,
    lastSyncedAt: new Date().toISOString(),
  });

  return {
    trips,
    travelogueVersion: data.pushChanges.travelogueVersion,
    conflicts: data.pushChanges.conflicts,
  };
}

function outboxEntryToChangeInput(entry: OutboxEntry) {
  return {
    clientMutationId: entry.clientMutationId,
    type: entry.type,
    tripId: entry.tripId ?? null,
    baseVersion: entry.baseVersion ?? null,
    payload: entry.payload ?? null,
  };
}
