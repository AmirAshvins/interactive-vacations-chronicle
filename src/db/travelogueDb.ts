import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Trip, TravelogueData } from '../types/travelogue';
import {
  clearAllImages,
  deleteImagesForTrip,
  persistDataUrlsAsImages,
} from './tripImages';

const DB_NAME = 'ivc-travelogue';
const LEGACY_DB_NAME = 'bedrood-azizi-travelogue';
const DB_VERSION = 4;
const META_INITIALIZED = 'initialized';

export interface StoredImageRecord {
  id: string;
  tripId: string;
  blob: Blob;
  mimeType: string;
}

interface TravelogueDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
  };
  images: {
    key: string;
    value: StoredImageRecord;
    indexes: { byTripId: string };
  };
  meta: {
    key: string;
    value: boolean;
  };
}

let dbPromise: Promise<IDBPDatabase<TravelogueDB>> | null = null;
let legacyMigrationPromise: Promise<void> | null = null;

/** Idempotent — safe to run on fresh installs and partial upgrades. */
function runTravelogueUpgrade(db: IDBPDatabase<TravelogueDB>) {
  if (!db.objectStoreNames.contains('trips')) {
    db.createObjectStore('trips', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('meta')) {
    db.createObjectStore('meta');
  }
  if ((db.objectStoreNames as DOMStringList).contains('flights')) {
    db.deleteObjectStore('flights' as 'trips');
  }
  if (!db.objectStoreNames.contains('images')) {
    const images = db.createObjectStore('images', { keyPath: 'id' });
    images.createIndex('byTripId', 'tripId');
  }
}

async function legacyDatabaseExists(): Promise<boolean | 'unknown'> {
  if (typeof indexedDB.databases === 'function') {
    const dbs = await indexedDB.databases();
    return dbs.some((d) => d.name === LEGACY_DB_NAME);
  }
  return 'unknown';
}

async function openLegacyDatabase(): Promise<IDBPDatabase<TravelogueDB> | null> {
  const exists = await legacyDatabaseExists();
  if (exists === false) return null;

  try {
    return await openDB<TravelogueDB>(LEGACY_DB_NAME, DB_VERSION, {
      upgrade(db) {
        runTravelogueUpgrade(db);
      },
    });
  } catch {
    return null;
  }
}

async function migrateLegacyDatabaseIfNeeded(db: IDBPDatabase<TravelogueDB>): Promise<void> {
  try {
    const initialized = await db.get('meta', META_INITIALIZED);
    if (initialized) return;

    const legacyDb = await openLegacyDatabase();
    if (!legacyDb) return;

    try {
      if (!legacyDb.objectStoreNames.contains('meta')) return;

      const legacyInitialized = await legacyDb.get('meta', META_INITIALIZED);
      if (!legacyInitialized) {
        const tripCount = legacyDb.objectStoreNames.contains('trips')
          ? await legacyDb.count('trips')
          : 0;
        if (tripCount === 0) {
          await deleteDB(LEGACY_DB_NAME).catch(() => {});
        }
        return;
      }

      if (!legacyDb.objectStoreNames.contains('trips')) return;

      const legacyTrips = await legacyDb.getAll('trips');
      const tx = db.transaction(['trips', 'meta'], 'readwrite');
      for (const trip of legacyTrips) {
        await tx.objectStore('trips').put({ ...trip, imageIds: trip.imageIds ?? [] });
      }
      await tx.objectStore('meta').put(true, META_INITIALIZED);
      await tx.done;

      if (
        legacyDb.objectStoreNames.contains('images') &&
        db.objectStoreNames.contains('images')
      ) {
        const legacyImages = await legacyDb.getAll('images');
        if (legacyImages.length > 0) {
          const imageTx = db.transaction(['images'], 'readwrite');
          for (const image of legacyImages) {
            await imageTx.objectStore('images').put(image);
          }
          await imageTx.done;
        }
      }
    } finally {
      legacyDb.close();
    }
  } catch (err) {
    console.warn('[travelogue] Legacy migration skipped:', err);
  }
}

async function ensureLegacyMigration(db: IDBPDatabase<TravelogueDB>): Promise<void> {
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = migrateLegacyDatabaseIfNeeded(db);
  }
  await legacyMigrationPromise;
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TravelogueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        runTravelogueUpgrade(db);
      },
    });
  }
  return dbPromise;
}

/** Chronicle import may still carry inline base64 `images` instead of `imageIds` */
type TripWithInlineImages = Trip & { images?: string[] };

function stripInlineImages(trip: TripWithInlineImages): Trip {
  const { images: _removed, ...rest } = trip;
  return { ...rest, imageIds: rest.imageIds ?? [] };
}

async function normalizeLoadedTrip(raw: TripWithInlineImages): Promise<Trip> {
  if (raw.imageIds?.length) {
    return stripInlineImages(raw);
  }

  if (raw.images?.length) {
    const imageIds = await persistDataUrlsAsImages(raw.id, raw.images);
    const trip: Trip = { ...stripInlineImages(raw), imageIds };
    await saveTripRecord(trip);
    return trip;
  }

  return { ...stripInlineImages(raw), imageIds: [] };
}

async function replaceTrips(trips: Trip[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['trips', 'meta'], 'readwrite');
  await tx.objectStore('trips').clear();
  for (const trip of trips) {
    await tx.objectStore('trips').put({ ...trip, imageIds: trip.imageIds ?? [] });
  }
  await tx.objectStore('meta').put(true, META_INITIALIZED);
  await tx.done;
}

export async function loadTravelogue(initial: TravelogueData): Promise<TravelogueData> {
  const db = await getDb();
  await ensureLegacyMigration(db);
  const initialized = await db.get('meta', META_INITIALIZED);

  if (initialized) {
    const rawTrips = await db.getAll('trips');
    const trips = await Promise.all(rawTrips.map((t) => normalizeLoadedTrip(t as TripWithInlineImages)));
    return { trips };
  }

  await replaceTrips(initial.trips);
  return initial;
}

export async function replaceAllTrips(trips: Trip[]): Promise<void> {
  await clearAllImages();
  await replaceTrips(trips);
}

export async function saveTripRecord(trip: Trip): Promise<void> {
  const db = await getDb();
  await db.put('trips', { ...trip, imageIds: trip.imageIds ?? [] });
}

export async function deleteTripRecord(id: string): Promise<void> {
  const db = await getDb();
  await deleteImagesForTrip(id);
  await db.delete('trips', id);
}
