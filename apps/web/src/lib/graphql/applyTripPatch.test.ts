import { describe, expect, it } from 'vitest';
import { applyTripPatch, type TripPatchMessage } from './applyTripPatch';
import type { Trip } from '../../types/travelogue';
import type { ServerTrip } from './mappers';

function serverTrip(overrides: Partial<ServerTrip> = {}): ServerTrip {
  return {
    id: 'trip-1',
    countryCode: 'ca',
    name: 'Toronto',
    lat: 43.65,
    lng: -79.38,
    description: 'Notes',
    material: 'brass',
    version: 1,
    imageUrls: [],
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function patch(overrides: Partial<TripPatchMessage>): TripPatchMessage {
  return {
    op: 'UPDATED',
    tripId: 'trip-1',
    version: 1,
    ...overrides,
  };
}

const existing: Trip[] = [
  {
    id: 'trip-1',
    countryCode: 'ca',
    name: 'Toronto',
    lat: 43.65,
    lng: -79.38,
    description: 'Notes',
    material: 'brass',
    version: 1,
  },
];

describe('applyTripPatch', () => {
  it('removes a trip on DELETED', () => {
    const next = applyTripPatch(existing, patch({ op: 'DELETED', trip: undefined }));
    expect(next).toHaveLength(0);
  });

  it('ignores duplicate CREATED', () => {
    const next = applyTripPatch(
      existing,
      patch({ op: 'CREATED', trip: serverTrip() }),
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe('trip-1');
  });

  it('appends CREATED when trip is new', () => {
    const next = applyTripPatch(
      existing,
      patch({ op: 'CREATED', tripId: 'trip-2', trip: serverTrip({ id: 'trip-2', name: 'Montreal' }) }),
    );
    expect(next).toHaveLength(2);
    expect(next.find((t) => t.id === 'trip-2')?.name).toBe('Montreal');
  });

  it('replaces an existing trip on UPDATED', () => {
    const next = applyTripPatch(
      existing,
      patch({ op: 'UPDATED', trip: serverTrip({ name: 'Updated Toronto', version: 2 }) }),
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.name).toBe('Updated Toronto');
    expect(next[0]?.version).toBe(2);
  });

  it('appends UPDATED when trip was missing locally', () => {
    const next = applyTripPatch(
      [],
      patch({ op: 'UPDATED', trip: serverTrip() }),
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe('trip-1');
  });

  it('no-ops UPDATED/CREATED when trip payload is missing', () => {
    expect(applyTripPatch(existing, patch({ op: 'UPDATED', trip: null }))).toEqual(existing);
    expect(applyTripPatch(existing, patch({ op: 'CREATED', trip: undefined }))).toEqual(existing);
  });
});
