import { describe, expect, it } from 'vitest';
import { projectCoordinates, unprojectCoordinates } from './mapProjection';

describe('mapProjection', () => {
  it('round-trips known coordinates', () => {
    const cases = [
      { lat: 0, lng: 0 },
      { lat: 43.6532, lng: -79.3832 },
      { lat: -33.8688, lng: 151.2093 },
      { lat: 90, lng: -180 },
      { lat: -90, lng: 180 },
    ];

    for (const { lat, lng } of cases) {
      const { x, y } = projectCoordinates(lat, lng);
      const back = unprojectCoordinates(x, y);
      expect(back.lat).toBeCloseTo(lat, 5);
      expect(back.lng).toBeCloseTo(lng, 5);
    }
  });

  it('maps prime meridian/equator to viewBox center axes', () => {
    const { x, y } = projectCoordinates(0, 0);
    const back = unprojectCoordinates(x, y);
    expect(back.lat).toBeCloseTo(0, 10);
    expect(back.lng).toBeCloseTo(0, 10);
  });
});
