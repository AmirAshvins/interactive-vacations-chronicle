import { describe, expect, it } from 'vitest';
import { applySyncDeltaToTrips } from './applySyncDelta';
import type { Trip } from '../../types/travelogue';

const baseTrip: Trip = {
  id: 'trip-1',
  countryCode: 'ca',
  name: 'Toronto',
  lat: 43.65,
  lng: -79.38,
  description: '',
  material: 'brass',
  version: 1,
};

describe('applySyncDeltaToTrips', () => {
  it('applies patches in order', () => {
    const next = applySyncDeltaToTrips([baseTrip], {
      travelogueVersion: 3,
      patches: [
        {
          op: 'UPDATED',
          tripId: 'trip-1',
          version: 2,
          trip: {
            id: 'trip-1',
            countryCode: 'ca',
            name: 'Renamed',
            lat: 43.65,
            lng: -79.38,
            description: '',
            material: 'brass',
            version: 2,
            imageUrls: [],
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        },
        { op: 'DELETED', tripId: 'trip-1', version: 3 },
      ],
    });

    expect(next).toHaveLength(0);
  });
});
