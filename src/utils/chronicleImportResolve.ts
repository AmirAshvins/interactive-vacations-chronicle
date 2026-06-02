import type { Trip } from '../types/travelogue';
import type { ImportTrip } from './chronicleTransfer';

export type ChronicleImportResolution = 'merge' | 'replace';

export function findImportConflicts(existing: Trip[], imported: ImportTrip[]): string[] {
  const existingIds = new Set(existing.map((t) => t.id));
  const conflicts: string[] = [];
  for (const trip of imported) {
    if (existingIds.has(trip.id)) {
      conflicts.push(trip.id);
    }
  }
  return conflicts;
}

export function countNewImportTrips(existing: Trip[], imported: ImportTrip[]): number {
  const existingIds = new Set(existing.map((t) => t.id));
  return imported.filter((t) => !existingIds.has(t.id)).length;
}
