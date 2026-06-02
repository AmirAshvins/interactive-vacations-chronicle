import type { Trip } from '../../types/travelogue';
import type { TripPatchMessage } from './applyTripPatch';
import { applyTripPatch } from './applyTripPatch';

export interface SyncDeltaResponse {
  travelogueVersion: number;
  patches: TripPatchMessage[];
}

export function applySyncDeltaToTrips(trips: Trip[], delta: SyncDeltaResponse): Trip[] {
  let next = trips;
  for (const patch of delta.patches) {
    next = applyTripPatch(next, patch);
  }
  return next;
}
