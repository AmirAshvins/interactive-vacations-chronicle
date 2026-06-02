import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Trip } from '../types/travelogue';

const DB_NAME = 'ivc-sync';
const DB_VERSION = 1;

export type OutboxChangeType = 'CREATE_TRIP' | 'UPDATE_TRIP' | 'DELETE_TRIP';

export interface SyncMeta {
  travelogueId: string;
  serverVersion: number;
  lastSyncedAt: string;
}

export interface OutboxEntry {
  clientMutationId: string;
  travelogueId: string;
  type: OutboxChangeType;
  tripId?: string;
  baseVersion?: number;
  payload?: string;
  pendingImageBlobIds: string[];
  createdAt: number;
}

export interface OutboxBlob {
  id: string;
  blob: Blob;
  mimeType: string;
}

/** Trip row in IDB — includes travelogueId for indexing */
type CachedTrip = Trip & { travelogueId: string };

interface SyncDB extends DBSchema {
  trips: {
    key: string;
    value: CachedTrip;
    indexes: { byTravelogueId: string };
  };
  sync_meta: {
    key: string;
    value: SyncMeta;
  };
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { byTravelogueId: string };
  };
  outbox_blobs: {
    key: string;
    value: OutboxBlob;
  };
}

let dbPromise: Promise<IDBPDatabase<SyncDB>> | null = null;

export function getSyncDb() {
  if (!dbPromise) {
    dbPromise = openDB<SyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const trips = db.createObjectStore('trips', { keyPath: 'id' });
        trips.createIndex('byTravelogueId', 'travelogueId', { unique: false });
        db.createObjectStore('sync_meta', { keyPath: 'travelogueId' });
        const outbox = db.createObjectStore('outbox', { keyPath: 'clientMutationId' });
        outbox.createIndex('byTravelogueId', 'travelogueId');
        db.createObjectStore('outbox_blobs', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getSyncMeta(travelogueId: string): Promise<SyncMeta | null> {
  const db = await getSyncDb();
  return (await db.get('sync_meta', travelogueId)) ?? null;
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await getSyncDb();
  await db.put('sync_meta', meta);
}

export async function loadCachedTrips(travelogueId: string): Promise<Trip[]> {
  const db = await getSyncDb();
  const all = await db.getAllFromIndex('trips', 'byTravelogueId', travelogueId);
  return all.map(({ travelogueId: _tid, ...trip }) => trip);
}

export async function saveCachedTrips(travelogueId: string, trips: Trip[]): Promise<void> {
  const db = await getSyncDb();
  const existing = await db.getAllFromIndex('trips', 'byTravelogueId', travelogueId);
  const tx = db.transaction('trips', 'readwrite');
  const store = tx.objectStore('trips');
  for (const row of existing) {
    await store.delete(row.id);
  }
  for (const trip of trips) {
    const row: CachedTrip = { ...trip, travelogueId };
    await store.put(row);
  }
  await tx.done;
}

export async function saveCachedTrip(travelogueId: string, trip: Trip): Promise<void> {
  const db = await getSyncDb();
  const row: CachedTrip = { ...trip, travelogueId };
  await db.put('trips', row);
}

export async function deleteCachedTrip(id: string): Promise<void> {
  const db = await getSyncDb();
  await db.delete('trips', id);
}

export async function listOutbox(travelogueId: string): Promise<OutboxEntry[]> {
  const db = await getSyncDb();
  const entries = await db.getAllFromIndex('outbox', 'byTravelogueId', travelogueId);
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

export async function appendOutbox(entry: OutboxEntry): Promise<void> {
  const db = await getSyncDb();
  await db.put('outbox', entry);
}

export async function removeOutboxEntries(clientMutationIds: string[]): Promise<void> {
  if (!clientMutationIds.length) return;
  const db = await getSyncDb();
  for (const id of clientMutationIds) {
    const entry = await db.get('outbox', id);
    if (entry?.pendingImageBlobIds.length) {
      for (const blobId of entry.pendingImageBlobIds) {
        await db.delete('outbox_blobs', blobId);
      }
    }
    await db.delete('outbox', id);
  }
}

export async function clearOutboxForTravelogue(travelogueId: string): Promise<void> {
  const entries = await listOutbox(travelogueId);
  await removeOutboxEntries(entries.map((e) => e.clientMutationId));
}

export async function outboxCount(travelogueId: string): Promise<number> {
  const entries = await listOutbox(travelogueId);
  return entries.length;
}

export async function saveOutboxBlob(blob: Blob): Promise<string> {
  const id = `ob-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const db = await getSyncDb();
  await db.put('outbox_blobs', {
    id,
    blob,
    mimeType: blob.type || 'image/jpeg',
  });
  return id;
}

export async function getOutboxBlob(id: string): Promise<Blob | null> {
  const db = await getSyncDb();
  const row = await db.get('outbox_blobs', id);
  return row?.blob ?? null;
}

export async function remapCachedTripId(
  travelogueId: string,
  clientTripId: string,
  serverTripId: string,
): Promise<void> {
  const db = await getSyncDb();
  const old = await db.get('trips', clientTripId);
  if (!old) return;
  await db.delete('trips', clientTripId);
  const { travelogueId: _tid, ...trip } = old;
  await db.put('trips', { ...trip, id: serverTripId, travelogueId });
}
