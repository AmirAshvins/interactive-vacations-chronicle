/** Server sync patch operations (GraphQL subscription payload shape). */
export type PatchOp = 'CREATED' | 'UPDATED' | 'DELETED';

export interface TripPatch {
  op: PatchOp;
  tripId: string;
  version: number;
  /** Present for CREATED and UPDATED; omitted for DELETED. */
  trip?: import('./travelogue.js').Trip;
}

export interface SyncDelta {
  travelogueVersion: number;
  patches: TripPatch[];
}
