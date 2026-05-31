import type { Trip, ChronicleExport } from '../types/travelogue';

export const CHRONICLE_EXPORT_VERSION = 1;

export function buildChronicleExport(trips: Trip[]): ChronicleExport {
  return {
    version: CHRONICLE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    trips,
  };
}

export function downloadChronicleExport(trips: Trip[]): void {
  const payload = buildChronicleExport(trips);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `chronicle-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseChronicleImport(raw: unknown): Trip[] {
  let tripsRaw: unknown;

  if (Array.isArray(raw)) {
    tripsRaw = raw;
  } else if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.trips)) {
      tripsRaw = record.trips;
    } else {
      throw new Error('JSON must contain a "trips" array.');
    }
  } else {
    throw new Error('Invalid chronicle file.');
  }

  const trips = (tripsRaw as unknown[])
    .map(normalizeTrip)
    .filter((t): t is Trip => t !== null);

  if (trips.length === 0) {
    throw new Error('No valid journal entries found in file.');
  }

  const ids = new Set<string>();
  for (const trip of trips) {
    if (ids.has(trip.id)) {
      throw new Error(`Duplicate journal id "${trip.id}" in import file.`);
    }
    ids.add(trip.id);
  }

  return trips;
}

export async function readChronicleFile(file: File): Promise<Trip[]> {
  if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
    throw new Error('Please choose a .json chronicle file.');
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  return parseChronicleImport(parsed);
}

function normalizeTrip(raw: unknown): Trip | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;

  const id = typeof t.id === 'string' ? t.id.trim() : '';
  const name = typeof t.name === 'string' ? t.name.trim() : '';
  const countryCode = typeof t.countryCode === 'string' ? t.countryCode.trim().toLowerCase() : '';
  const lat = typeof t.lat === 'number' ? t.lat : NaN;
  const lng = typeof t.lng === 'number' ? t.lng : NaN;
  const description = typeof t.description === 'string' ? t.description : '';
  const material = t.material === 'copper' ? 'copper' : 'brass';

  if (!id || !name || !countryCode || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const images = Array.isArray(t.images)
    ? t.images.filter((img): img is string => typeof img === 'string')
    : [];

  const trip: Trip = {
    id,
    countryCode,
    name,
    lat,
    lng,
    description,
    material,
    images,
  };

  if (typeof t.cityKey === 'string' && t.cityKey.trim()) {
    trip.cityKey = t.cityKey.trim();
  }

  if (typeof t.startYear === 'number') trip.startYear = t.startYear;
  if (typeof t.startMonth === 'number') trip.startMonth = t.startMonth;
  if (typeof t.endYear === 'number') trip.endYear = t.endYear;
  if (typeof t.endMonth === 'number') trip.endMonth = t.endMonth;

  return trip;
}
