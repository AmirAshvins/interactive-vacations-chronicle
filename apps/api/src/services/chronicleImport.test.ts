import { describe, expect, it } from 'vitest';
import { parseChronicleJson } from './chronicleImport.js';
import { AppError } from '../lib/errors.js';

describe('parseChronicleJson', () => {
  it('parses a top-level trips array', () => {
    const trips = parseChronicleJson(
      JSON.stringify([
        {
          id: 'trip-a',
          name: 'Toronto',
          countryCode: 'CA',
          lat: 43.65,
          lng: -79.38,
        },
      ]),
    );

    expect(trips).toHaveLength(1);
    expect(trips[0]?.clientId).toBe('trip-a');
    expect(trips[0]?.input.name).toBe('Toronto');
    expect(trips[0]?.input.countryCode).toBe('ca');
    expect(trips[0]?.input.material).toBe('brass');
  });

  it('parses { trips: [...] } export shape', () => {
    const trips = parseChronicleJson(
      JSON.stringify({
        trips: [
          {
            id: 'trip-b',
            name: 'Paris',
            countryCode: 'fr',
            lat: 48.85,
            lng: 2.35,
            material: 'copper',
          },
        ],
      }),
    );

    expect(trips[0]?.input.material).toBe('copper');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseChronicleJson('{')).toThrow(AppError);
  });

  it('rejects missing trips array', () => {
    expect(() => parseChronicleJson('{"name":"x"}')).toThrow(/trips array/);
  });

  it('rejects empty valid rows', () => {
    expect(() => parseChronicleJson('{"trips":[{}]}')).toThrow(/No valid journal entries/);
  });

  it('rejects duplicate client ids', () => {
    expect(() =>
      parseChronicleJson(
        JSON.stringify([
          { id: 'dup', name: 'A', countryCode: 'ca', lat: 1, lng: 2 },
          { id: 'dup', name: 'B', countryCode: 'ca', lat: 3, lng: 4 },
        ]),
      ),
    ).toThrow(/Duplicate journal id/);
  });
});
