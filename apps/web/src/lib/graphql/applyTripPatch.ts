import type { PatchOp } from '@ivc/shared';
import type { Trip } from '../../types/travelogue';
import { serverTripToTrip, type ServerTrip } from './mappers';

export interface TripPatchMessage {
  op: PatchOp;
  tripId: string;
  version: number;
  trip?: ServerTrip | null;
}

export function applyTripPatch(trips: Trip[], patch: TripPatchMessage): Trip[] {
  if (patch.op === 'DELETED') {
    return trips.filter((t) => t.id !== patch.tripId);
  }

  if (!patch.trip) return trips;

  const trip = serverTripToTrip(patch.trip);

  if (patch.op === 'CREATED') {
    if (trips.some((t) => t.id === trip.id)) return trips;
    return [...trips, trip];
  }

  if (patch.op === 'UPDATED') {
    const index = trips.findIndex((t) => t.id === trip.id);
    if (index < 0) return [...trips, trip];
    const next = [...trips];
    next[index] = trip;
    return next;
  }

  return trips;
}
