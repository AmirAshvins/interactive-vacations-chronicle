/** Extra SVG-space nudges for places where country-level offset is not enough. */
export const MAP_PIN_NUDGES: Record<string, { dx: number; dy: number }> = {
  // cityKey
  colombo: { dx: -5, dy: 6 },
  denpasar: { dx: 3, dy: 4 },
  // trip id fragments (Bedrood template & common outliers)
  'easter-island': { dx: -18, dy: 22 },
  'st-johns': { dx: 8, dy: -6 },
  'machu-picchu': { dx: 2, dy: 5 },
  'blue-lagoon': { dx: -4, dy: -8 },
  'princes-islands': { dx: 0, dy: -5 },
  'islas-del-rosario': { dx: 6, dy: 8 },
  baru: { dx: 5, dy: 6 },
  bocagrande: { dx: 4, dy: 5 },
  'venice-beach': { dx: -3, dy: 2 },
  hollywood: { dx: -2, dy: 1 },
  'santa-monica': { dx: -3, dy: 2 },
  portofino: { dx: 0, dy: -4 },
  'cinque-terre': { dx: 2, dy: -3 },
  santorini: { dx: 4, dy: -3 },
  kefalonia: { dx: 3, dy: -2 },
  bodrum: { dx: 2, dy: -4 },
  belek: { dx: 3, dy: -5 },
  turgutreis: { dx: 2, dy: -4 },
  varadero: { dx: -4, dy: 3 },
  gananoque: { dx: 6, dy: -4 },
  'vancouver-island': { dx: -8, dy: 5 },
};

export function resolveMapPinNudge(cityKey?: string, pinId?: string): { dx: number; dy: number } | null {
  if (cityKey && MAP_PIN_NUDGES[cityKey]) return MAP_PIN_NUDGES[cityKey];
  if (pinId) {
    for (const [key, nudge] of Object.entries(MAP_PIN_NUDGES)) {
      if (pinId.includes(key)) return nudge;
    }
  }
  return null;
}
