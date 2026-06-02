import type { ChronicleExport } from '../../types/travelogue';

/** Bundled family chronicle — import with code "Bedrood Azizi". */
export const bedroodAziziTemplate: ChronicleExport = {
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  trips: [
    {
      id: 'bedrood-tehran',
      name: 'Tehran',
      countryCode: 'ir',
      cityKey: 'tehran',
      lat: 35.6892,
      lng: 51.389,
      description:
        'Family roots in the capital — evenings on the terrace, shared meals, and stories passed down.',
      material: 'brass',
      startYear: 2023,
      startMonth: 6,
      endYear: 2023,
      endMonth: 8,
      imageIds: [],
    },
    {
      id: 'bedrood-toronto',
      name: 'Toronto',
      countryCode: 'ca',
      cityKey: 'toronto',
      lat: 43.6532,
      lng: -79.3832,
      description:
        'Home base on the lake — school years, winter walks, and the neighbourhood we return to.',
      material: 'copper',
      startYear: 2024,
      startMonth: 1,
      imageIds: [],
    },
    {
      id: 'bedrood-vancouver',
      name: 'Vancouver',
      countryCode: 'ca',
      cityKey: 'vancouver',
      lat: 49.2827,
      lng: -123.1207,
      description:
        'West coast visits — rain on the mountains, ferry days, and summer reunions by the harbour.',
      material: 'brass',
      startYear: 2024,
      startMonth: 7,
      endYear: 2024,
      endMonth: 8,
      imageIds: [],
    },
  ],
};
