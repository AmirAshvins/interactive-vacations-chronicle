import type { Database } from '../db/index.js';
import type { trips as tripsTable } from '../db/schema.js';
import { mapTripToGraphql } from '../graphql/mappers.js';
import { traveloguePubSub } from '../pubsub/travelogue.js';

type TripRow = typeof tripsTable.$inferSelect;

function publish(travelogueId: string, payload: import('../pubsub/travelogue.js').TripPatchPayload) {
  traveloguePubSub.publish('travelogue-updated', travelogueId, payload);
}

export async function publishTripCreated(db: Database, travelogueId: string, trip: TripRow) {
  publish(travelogueId, {
    op: 'CREATED',
    tripId: trip.id,
    version: trip.version,
    trip: await mapTripToGraphql(db, trip),
  });
}

export async function publishTripUpdated(db: Database, travelogueId: string, trip: TripRow) {
  publish(travelogueId, {
    op: 'UPDATED',
    tripId: trip.id,
    version: trip.version,
    trip: await mapTripToGraphql(db, trip),
  });
}

export function publishTripDeleted(travelogueId: string, tripId: string, version: number) {
  publish(travelogueId, {
    op: 'DELETED',
    tripId,
    version,
  });
}
