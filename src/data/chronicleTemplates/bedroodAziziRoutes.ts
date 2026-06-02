/**
 * Bedrood Azizi family route — each segment is visited from Toronto (home) and back.
 * Coordinates from worldCities.ts where available; otherwise standard city centers.
 */
export interface RouteCity {
  slug: string;
  name: string;
  countryCode: string;
  cityKey?: string;
  lat: number;
  lng: number;
}

const c = (
  slug: string,
  name: string,
  countryCode: string,
  lat: number,
  lng: number,
  cityKey?: string,
): RouteCity => ({ slug, name, countryCode, lat, lng, cityKey });

/** Destinations per country/region (Toronto bookends added when building the export). */
export const BEDROOD_COUNTRY_ROUTES: {
  label: string;
  /** Unique id prefix when the same country appears more than once */
  segmentKey?: string;
  cities: RouteCity[];
}[] = [
  {
    label: 'Spain',
    cities: [
      c('barcelona', 'Barcelona', 'es', 41.3888, 2.159, 'barcelona'),
      c('valencia', 'Valencia', 'es', 39.4739, -0.3797, 'valencia'),
    ],
  },
  {
    label: 'Italy',
    cities: [
      c('venice', 'Venice', 'it', 45.4408, 12.3155),
      c('bolzano', 'Bolzano', 'it', 46.4983, 11.3548),
      c('torino', 'Torino', 'it', 45.0705, 7.6868, 'turin'),
      c('milan', 'Milan', 'it', 45.4643, 9.1895, 'milan'),
      c('portofino', 'Portofino', 'it', 44.3036, 9.2094),
      c('cinque-terre', 'Cinque Terre', 'it', 44.1063, 9.7286),
      c('genoa', 'Genoa', 'it', 44.4048, 8.9444, 'genoa'),
      c('torino-return', 'Torino', 'it', 45.0705, 7.6868, 'turin'),
    ],
  },
  {
    label: 'France',
    cities: [c('paris', 'Paris', 'fr', 48.8534, 2.3488, 'paris')],
  },
  {
    label: 'England',
    cities: [c('london', 'London', 'gb', 51.5085, -0.1257, 'london-gb')],
  },
  {
    label: 'Ireland',
    cities: [
      c('galway', 'Galway', 'ie', 53.2725, -9.0509, 'galway'),
      c('dublin', 'Dublin', 'ie', 53.3331, -6.2489, 'dublin'),
      c('kilkenny', 'Kilkenny', 'ie', 52.6541, -7.2448),
    ],
  },
  {
    label: 'Scotland',
    cities: [
      c('glasgow', 'Glasgow', 'gb', 55.8652, -4.2576, 'glasgow'),
      c('inverness', 'Inverness', 'gb', 57.4778, -4.2247),
      c('edinburgh', 'Edinburgh', 'gb', 55.9521, -3.1965, 'edinburgh'),
    ],
  },
  {
    label: 'Germany',
    cities: [
      c('berlin', 'Berlin', 'de', 52.5244, 13.4105, 'berlin'),
      c('wiesbaden', 'Wiesbaden', 'de', 50.086, 8.2444, 'wiesbaden'),
      c('hamburg', 'Hamburg', 'de', 53.5507, 9.993, 'hamburg'),
    ],
  },
  {
    label: 'Portugal',
    segmentKey: 'portugal-lisbon',
    cities: [c('lisbon', 'Lisbon', 'pt', 38.7251, -9.1498, 'lisbon')],
  },
  {
    label: 'Greece',
    cities: [
      c('athens', 'Athens', 'gr', 37.9838, 23.7278, 'athens'),
      c('santorini', 'Santorini', 'gr', 36.3932, 25.4615),
      c('kefalonia', 'Kefalonia', 'gr', 38.1754, 20.4894),
    ],
  },
  {
    label: 'Switzerland',
    cities: [
      c('zurich', 'Zurich', 'ch', 47.3769, 8.5417),
      c('lugano', 'Lugano', 'ch', 46.0101, 8.96, 'lugano'),
    ],
  },
  {
    label: 'Russia',
    cities: [
      c('moscow', 'Moscow', 'ru', 55.752, 37.6178, 'moscow'),
      c('saint-petersburg', 'Saint Petersburg', 'ru', 59.9386, 30.3141, 'saint-petersburg'),
      c('kazan', 'Kazan', 'ru', 55.7887, 49.1221, 'kazan'),
    ],
  },
  {
    label: 'Azerbaijan',
    cities: [c('baku', 'Baku', 'az', 40.3777, 49.892, 'baku')],
  },
  {
    label: 'Cuba',
    cities: [
      c('varadero', 'Varadero', 'cu', 23.1595, -81.2469),
      c('havana', 'Havana', 'cu', 23.133, -82.383, 'havana'),
    ],
  },
  {
    label: 'Panama',
    cities: [c('panama-city', 'Panama City', 'pa', 8.9936, -79.5197, 'panama-city')],
  },
  {
    label: 'Mexico',
    cities: [c('cancun', 'Cancun', 'mx', 21.1743, -86.8466, 'cancun')],
  },
  {
    label: 'Chile',
    cities: [
      c('santiago', 'Santiago', 'cl', -33.4569, -70.6483, 'santiago'),
      c('valparaiso', 'Valparaíso', 'cl', -33.036, -71.6296, 'valparaiso'),
      c('easter-island', 'Easter Island', 'cl', -27.1127, -109.3497),
    ],
  },
  {
    label: 'Colombia',
    cities: [
      c('cartagena', 'Cartagena', 'co', 10.3982, -75.4933, 'cartagena'),
      c('baru', 'Barú', 'co', 10.205, -75.5892),
      c('bocagrande', 'Bocagrande', 'co', 10.3996, -75.5547),
      c('castillo', 'Castillo San Felipe', 'co', 10.4222, -75.5392),
      c('islas-del-rosario', 'Islas del Rosario', 'co', 10.156, -75.78),
    ],
  },
  {
    label: 'Bolivia',
    cities: [c('la-paz', 'La Paz', 'bo', -16.5, -68.15, 'la-paz')],
  },
  {
    label: 'Jamaica',
    cities: [c('montego-bay', 'Montego Bay', 'jm', 18.4712, -77.9188, 'montego-bay')],
  },
  {
    label: 'Netherlands',
    cities: [
      c('amsterdam', 'Amsterdam', 'nl', 52.374, 4.8897, 'amsterdam'),
      c('rotterdam', 'Rotterdam', 'nl', 51.9225, 4.4792, 'rotterdam'),
      c('delft', 'Delft', 'nl', 52.0116, 4.3571),
      c('utrecht', 'Utrecht', 'nl', 52.0908, 5.1222, 'utrecht'),
    ],
  },
  {
    label: 'Lithuania',
    cities: [c('vilnius', 'Vilnius', 'lt', 54.6892, 25.2798, 'vilnius')],
  },
  {
    label: 'Latvia',
    cities: [c('riga', 'Riga', 'lv', 56.946, 24.1059, 'riga')],
  },
  {
    label: 'Estonia',
    cities: [c('tallinn', 'Tallinn', 'ee', 59.437, 24.7535, 'tallinn')],
  },
  {
    label: 'Finland',
    cities: [c('helsinki', 'Helsinki', 'fi', 60.1695, 24.9355, 'helsinki')],
  },
  {
    label: 'Sweden',
    cities: [c('stockholm', 'Stockholm', 'se', 59.3294, 18.0687, 'stockholm')],
  },
  {
    label: 'Iceland',
    cities: [
      c('blue-lagoon', 'Blue Lagoon', 'is', 63.8804, -22.4495),
      c('reykjavik', 'Reykjavik', 'is', 64.1355, -21.8954, 'reykjavik'),
    ],
  },
  {
    label: 'Peru',
    cities: [
      c('cusco', 'Cusco', 'pe', -13.5319, -71.967, 'cusco'),
      c('lima', 'Lima', 'pe', -12.0432, -77.0282, 'lima'),
      c('machu-picchu', 'Machu Picchu', 'pe', -13.1631, -72.545),
    ],
  },
  {
    label: 'Turkey',
    cities: [
      c('turgutreis', 'Turgutreis', 'tr', 37.0167, 27.2667),
      c('istanbul', 'Istanbul', 'tr', 41.0138, 28.9497, 'istanbul'),
      c('bodrum', 'Bodrum', 'tr', 37.0344, 27.4305),
      c('princes-islands', "Princes' Islands", 'tr', 40.8739, 29.095),
      c('belek', 'Belek', 'tr', 36.8628, 31.0556),
    ],
  },
  {
    label: 'Hungary',
    cities: [c('budapest', 'Budapest', 'hu', 47.4984, 19.0405, 'budapest')],
  },
  {
    label: 'Czech Republic',
    cities: [c('prague', 'Prague', 'cz', 50.088, 14.4208, 'prague')],
  },
  {
    label: 'Belgium',
    cities: [c('antwerp', 'Antwerp', 'be', 51.2205, 4.4003, 'antwerpen')],
  },
  {
    label: 'Poland',
    cities: [c('warsaw', 'Warsaw', 'pl', 52.2298, 21.0118, 'warsaw')],
  },
  {
    label: 'Slovenia',
    cities: [c('ljubljana', 'Ljubljana', 'si', 46.0511, 14.5051, 'ljubljana')],
  },
  {
    label: 'Newfoundland',
    cities: [c('st-johns', "St. John's", 'ca', 47.5615, -52.7126)],
  },
  {
    label: 'Canada',
    cities: [
      c('vancouver', 'Vancouver', 'ca', 49.2827, -123.1207, 'vancouver'),
      c('vancouver-island', 'Vancouver Island', 'ca', 48.4359, -123.3515, 'victoria'),
      c('halifax', 'Halifax', 'ca', 44.6427, -63.5769, 'halifax'),
      c('quebec-city', 'Quebec City', 'ca', 46.8123, -71.2145, 'quebec'),
      c('ottawa', 'Ottawa', 'ca', 45.4112, -75.6981, 'ottawa'),
      c('montreal', 'Montreal', 'ca', 45.5088, -73.5878, 'montreal'),
      c('gananoque', 'Gananoque', 'ca', 44.3306, -76.1617),
    ],
  },
  {
    label: 'Indonesia',
    cities: [c('bali', 'Bali', 'id', -8.65, 115.2167, 'denpasar')],
  },
  {
    label: 'Austria',
    cities: [c('vienna', 'Vienna', 'at', 48.2082, 16.3738, 'vienna')],
  },
  {
    label: 'Cyprus',
    cities: [c('nicosia', 'Nicosia', 'cy', 35.1728, 33.354, 'nicosia')],
  },
  {
    label: 'Portugal',
    segmentKey: 'portugal-sintra',
    cities: [c('sintra', 'Sintra', 'pt', 38.8029, -9.3817)],
  },
  {
    label: 'Thailand',
    cities: [
      c('pattaya', 'Pattaya', 'th', 12.9236, 100.8825),
      c('surat-thani', 'Surat Thani', 'th', 9.1401, 99.3331, 'surat-thani'),
    ],
  },
  {
    label: 'China',
    cities: [c('shanghai', 'Shanghai', 'cn', 31.2222, 121.4581, 'shanghai')],
  },
  {
    label: 'Argentina',
    cities: [c('buenos-aires', 'Buenos Aires', 'ar', -34.6131, -58.3772, 'buenos-aires')],
  },
  {
    label: 'United States',
    segmentKey: 'united-states-west',
    cities: [
      c('venice-beach', 'Venice Beach', 'us', 33.985, -118.4695),
      c('san-francisco', 'San Francisco', 'us', 37.7749, -122.4194, 'san-francisco-us'),
      c('las-vegas', 'Las Vegas', 'us', 36.1699, -115.1398),
      c('los-angeles', 'Los Angeles', 'us', 34.0522, -118.2437, 'los-angeles'),
      c('santa-monica', 'Santa Monica', 'us', 34.0195, -118.4912),
      c('new-york', 'New York', 'us', 40.7143, -74.006, 'new-york-city'),
      c('hollywood', 'Hollywood', 'us', 34.0928, -118.3287),
    ],
  },
  {
    label: 'Armenia',
    cities: [c('yerevan', 'Yerevan', 'am', 40.1777, 44.5126, 'yerevan')],
  },
  {
    label: 'Sri Lanka',
    cities: [c('colombo', 'Colombo', 'lk', 6.9355, 79.8487, 'colombo')],
  },
  {
    label: 'United States',
    segmentKey: 'united-states-saugatuck',
    cities: [c('saugatuck', 'Saugatuck', 'us', 42.6556, -86.2036)],
  },
  {
    label: 'Singapore',
    cities: [c('singapore', 'Singapore', 'sg', 1.2897, 103.8501, 'singapore')],
  },
  {
    label: 'Qatar',
    cities: [c('doha', 'Doha', 'qa', 25.2855, 51.531, 'doha')],
  },
  {
    label: 'UAE',
    cities: [c('dubai', 'Dubai', 'ae', 25.2048, 55.2708, 'dubai')],
  },
  {
    label: 'Oman',
    cities: [c('muscat', 'Muscat', 'om', 23.5841, 58.4078, 'muscat')],
  },
  {
    label: 'Syria',
    cities: [c('damascus', 'Damascus', 'sy', 33.5102, 36.2913, 'damascus')],
  },
  {
    label: 'Georgia',
    cities: [c('tbilisi', 'Tbilisi', 'ge', 41.6914, 44.8341, 'tbilisi')],
  },
];

export const TORONTO_HOME: RouteCity = {
  slug: 'toronto',
  name: 'Toronto',
  countryCode: 'ca',
  cityKey: 'toronto',
  lat: 43.6532,
  lng: -79.3832,
};
