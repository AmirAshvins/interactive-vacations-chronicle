import type { Database } from '../db/index.js';
import { AppError } from '../lib/errors.js';
import { getMemberRole, requireRole } from './travelogue.js';
import * as tripService from './trip.js';
import { getTravelogueById } from './travelogue.js';
import { mapTravelogueToGraphql, mapTripsToGraphql } from '../graphql/mappers.js';

export type ImportMode = 'REPLACE' | 'MERGE';

export interface ParsedImportTrip {
  clientId: string;
  input: tripService.TripInput;
}

function parseTripRow(raw: unknown): ParsedImportTrip | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;

  const clientId = typeof t.id === 'string' ? t.id.trim() : '';
  const name = typeof t.name === 'string' ? t.name.trim() : '';
  const countryCode = typeof t.countryCode === 'string' ? t.countryCode.trim().toLowerCase() : '';
  const lat = typeof t.lat === 'number' ? t.lat : NaN;
  const lng = typeof t.lng === 'number' ? t.lng : NaN;

  if (!clientId || !name || !countryCode || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    clientId,
    input: {
      countryCode,
      name,
      lat,
      lng,
      description: typeof t.description === 'string' ? t.description : '',
      material: t.material === 'copper' ? 'copper' : 'brass',
      cityKey: typeof t.cityKey === 'string' ? t.cityKey.trim() : null,
      startYear: typeof t.startYear === 'number' ? t.startYear : null,
      startMonth: typeof t.startMonth === 'number' ? t.startMonth : null,
      endYear: typeof t.endYear === 'number' ? t.endYear : null,
      endMonth: typeof t.endMonth === 'number' ? t.endMonth : null,
    },
  };
}

export function parseChronicleJson(json: string): ParsedImportTrip[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AppError('Invalid JSON', 'BAD_REQUEST', 400);
  }

  let tripsRaw: unknown;
  if (Array.isArray(parsed)) {
    tripsRaw = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { trips?: unknown }).trips)) {
    tripsRaw = (parsed as { trips: unknown[] }).trips;
  } else {
    throw new AppError('JSON must contain a trips array', 'BAD_REQUEST', 400);
  }

  const trips = (tripsRaw as unknown[])
    .map(parseTripRow)
    .filter((t): t is ParsedImportTrip => t !== null);

  if (!trips.length) {
    throw new AppError('No valid journal entries in import file', 'BAD_REQUEST', 400);
  }

  const ids = new Set<string>();
  for (const trip of trips) {
    if (ids.has(trip.clientId)) {
      throw new AppError(`Duplicate journal id "${trip.clientId}" in import`, 'BAD_REQUEST', 400);
    }
    ids.add(trip.clientId);
  }

  return trips;
}

export async function importChronicle(
  db: Database,
  travelogueId: string,
  userId: string,
  json: string,
  mode: ImportMode,
) {
  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'editor');

  const imported = parseChronicleJson(json);
  const { trips: existingRows } = await getTravelogueById(db, travelogueId, userId);
  const existingIds = new Set(existingRows.map((t) => t.id));

  if (mode === 'REPLACE') {
    for (const row of existingRows) {
      await tripService.deleteTrip(db, row.id, userId, row.version);
    }
    for (const entry of imported) {
      await tripService.createTrip(db, travelogueId, userId, entry.input);
    }
  } else {
    for (const entry of imported) {
      if (existingIds.has(entry.clientId)) continue;
      await tripService.createTrip(db, travelogueId, userId, entry.input);
    }
  }

  const { travelogue, trips } = await getTravelogueById(db, travelogueId, userId);
  const tripGql = await mapTripsToGraphql(db, trips);
  return mapTravelogueToGraphql(travelogue, tripGql);
}
