import type { Trip } from '../../types/travelogue';
import type { TripImageChanges } from '../../hooks/useTravelogueStore';
import {
  appendOutbox,
  saveCachedTrip,
  saveCachedTrips,
  saveOutboxBlob,
} from '../../db/syncDb';
import { tripToInput } from './mappers';

let mutationCounter = 0;
export function nextClientMutationId(): string {
  mutationCounter += 1;
  return `outbox-${Date.now()}-${mutationCounter}`;
}

export async function queueTripCreate(
  travelogueId: string,
  trip: Trip,
  imageChanges?: TripImageChanges,
): Promise<string> {
  const clientMutationId = nextClientMutationId();
  const pendingImageBlobIds: string[] = [];
  if (imageChanges?.add.length) {
    for (const blob of imageChanges.add) {
      pendingImageBlobIds.push(await saveOutboxBlob(blob));
    }
  }

  await appendOutbox({
    clientMutationId,
    travelogueId,
    type: 'CREATE_TRIP',
    payload: JSON.stringify({
      input: tripToInput(trip),
      clientTripId: trip.id,
    }),
    pendingImageBlobIds,
    createdAt: Date.now(),
  });

  await saveCachedTrip(travelogueId, trip);
  return clientMutationId;
}

export async function queueTripUpdate(
  travelogueId: string,
  trip: Trip,
  imageChanges?: TripImageChanges,
): Promise<string> {
  const clientMutationId = nextClientMutationId();
  const pendingImageBlobIds: string[] = [];
  if (imageChanges?.add.length) {
    for (const blob of imageChanges.add) {
      pendingImageBlobIds.push(await saveOutboxBlob(blob));
    }
  }

  await appendOutbox({
    clientMutationId,
    travelogueId,
    type: 'UPDATE_TRIP',
    tripId: trip.id,
    baseVersion: trip.version ?? 1,
    payload: JSON.stringify(tripToInput(trip)),
    pendingImageBlobIds,
    createdAt: Date.now(),
  });

  await saveCachedTrip(travelogueId, trip);
  return clientMutationId;
}

export async function queueTripDelete(travelogueId: string, trip: Trip): Promise<string> {
  const clientMutationId = nextClientMutationId();
  await appendOutbox({
    clientMutationId,
    travelogueId,
    type: 'DELETE_TRIP',
    tripId: trip.id,
    baseVersion: trip.version ?? 1,
    pendingImageBlobIds: [],
    createdAt: Date.now(),
  });
  return clientMutationId;
}

export async function persistTripsCache(travelogueId: string, trips: Trip[]): Promise<void> {
  await saveCachedTrips(travelogueId, trips);
}
