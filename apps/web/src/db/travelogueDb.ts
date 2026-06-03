import {
  deleteDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type StoreNames,
} from 'idb';
import type { Trip, TravelogueData } from '../types/travelogue';
import {
  clearAllImages,
  deleteImagesForTrip,
  persistDataUrlsAsImages,
} from './tripImages';
import { openAppDatabase, openExistingDatabase, storeExists } from './idbSupport';

const DB_NAME = 'ivc-travelogue';
const LEGACY_DB_NAME = 'bedrood-azizi-travelogue';
/** v4: repair DBs that reached v3 without an `images` store (mobile Safari / partial upgrades). */
const DB_VERSION = 4;
const META_INITIALIZED = 'initialized';
const META_LEGACY_MIGRATED = 'legacy-migrated';

export interface StoredImageRecord {
  id: string;
  tripId: string;
  blob?: Blob;
  mimeType: string;
  remoteUrl?: string;
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

const REQUIRED_STORES: StoreNames<TravelogueDB>[] = ['trips', 'images', 'meta'];

let dbPromise: Promise<IDBPDatabase<TravelogueDB>> | null = null;
let legacyMigrationPromise: Promise<void> | null = null;

function upgradeTravelogueDb(
  db: IDBPDatabase<TravelogueDB>,
  oldVersion: number,
  _newVersion: number | null,
  transaction: IDBPTransaction<TravelogueDB, StoreNames<TravelogueDB>[], 'versionchange'>,
): void {
  if (!storeExists(db, 'trips')) {
    db.createObjectStore('trips', { keyPath: 'id' });
  }
  if (!storeExists(db, 'meta')) {
    db.createObjectStore('meta');
  }

  const storeNames = db.objectStoreNames as unknown as DOMStringList;
  if (oldVersion > 0 && oldVersion < 2 && storeNames.contains('flights')) {
    (db as unknown as IDBDatabase).deleteObjectStore('flights');
  }

  if (!storeExists(db, 'images')) {
    const images = db.createObjectStore('images', { keyPath: 'id' });
    images.createIndex('byTripId', 'tripId');
  } else {
    const imagesStore = transaction.objectStore('images');
    if (!imagesStore.indexNames.contains('byTripId')) {
      imagesStore.createIndex('byTripId', 'tripId');
    }
  }
}

async function migrateLegacyDatabaseIfNeeded(db: IDBPDatabase<TravelogueDB>): Promise<void> {
  const legacyDone = await db.get('meta', META_LEGACY_MIGRATED);
  if (legacyDone) return;

  const legacyDb = await openExistingDatabase<TravelogueDB>(LEGACY_DB_NAME);
  if (!legacyDb) {
    await db.put('meta', true, META_LEGACY_MIGRATED);
    return;
  }

  try {
    const legacyInitialized = await legacyDb.get('meta', META_INITIALIZED);
    if (!legacyInitialized) return;

    if (!storeExists(legacyDb, 'trips')) return;

    const legacyTrips = await legacyDb.getAll('trips');
    const tx = db.transaction(['trips', 'meta'], 'readwrite');
    for (const trip of legacyTrips) {
      await tx.objectStore('trips').put({ ...trip, imageIds: trip.imageIds ?? [] });
    }
    await tx.objectStore('meta').put(true, META_INITIALIZED);
    await tx.done;

    if (storeExists(legacyDb, 'images') && storeExists(db, 'images')) {
      const legacyImages = await legacyDb.getAll('images');
      const imageTx = db.transaction(['images'], 'readwrite');
      for (const image of legacyImages) {
        await imageTx.objectStore('images').put(image);
      }
      await imageTx.done;
    }
  } finally {
    legacyDb.close();
    await db.put('meta', true, META_LEGACY_MIGRATED);
  }
}

async function ensureLegacyMigration(db: IDBPDatabase<TravelogueDB>): Promise<void> {
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = migrateLegacyDatabaseIfNeeded(db).catch((err) => {
      legacyMigrationPromise = null;
      console.error('[ivc/idb] Legacy travelogue migration failed', err);
    });
  }
  await legacyMigrationPromise;
}

async function openTravelogueDatabase(): Promise<IDBPDatabase<TravelogueDB>> {
  return openAppDatabase<TravelogueDB>({
    name: DB_NAME,
    version: DB_VERSION,
    requiredStores: REQUIRED_STORES,
    upgrade: upgradeTravelogueDb,
    onRepaired() {
      legacyMigrationPromise = null;
    },
  });
}

export async function getDb(): Promise<IDBPDatabase<TravelogueDB>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openTravelogueDatabase();
      await ensureLegacyMigration(db);
      return db;
    })();
  }

  try {
    return await dbPromise;
  } catch (err) {
    dbPromise = null;
    throw err;
  }
}

/** Reset module state (tests / manual recovery). */
export async function resetTravelogueDatabase(): Promise<void> {
  dbPromise = null;
  legacyMigrationPromise = null;
  await deleteDB(DB_NAME);
}

/** Chronicle import may still carry inline base64 `images` instead of `imageIds` */
type TripWithInlineImages = Trip & { images?: string[] };

function stripInlineImages(trip: TripWithInlineImages): Trip {
  const { images: _removed, ...rest } = trip;
  return { ...rest, imageIds: rest.imageIds ?? [] };
}

async function saveTripRecordInternal(trip: Trip): Promise<void> {
  const db = await getDb();
  await db.put('trips', { ...trip, imageIds: trip.imageIds ?? [] });
}

async function normalizeLoadedTrip(raw: TripWithInlineImages): Promise<Trip> {
  if (raw.imageIds?.length) {
    return stripInlineImages(raw);
  }

  if (raw.images?.length) {
    const imageIds = await persistDataUrlsAsImages(raw.id, raw.images);
    const trip: Trip = { ...stripInlineImages(raw), imageIds };
    await saveTripRecordInternal(trip);
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
  try {
    const db = await getDb();
    const initialized = await db.get('meta', META_INITIALIZED);

    if (initialized) {
      const rawTrips = await db.getAll('trips');
      const trips = await Promise.all(
        rawTrips.map((t) => normalizeLoadedTrip(t as TripWithInlineImages)),
      );
      return { trips };
    }

    await replaceTrips(initial.trips);
    return initial;
  } catch (err) {
    console.error('[ivc/idb] loadTravelogue failed, using in-memory seed', err);
    return initial;
  }
}

export async function replaceAllTrips(trips: Trip[]): Promise<void> {
  await clearAllImages();
  await replaceTrips(trips);
}

export async function saveTripRecord(trip: Trip): Promise<void> {
  await saveTripRecordInternal(trip);
}

export async function deleteTripRecord(id: string): Promise<void> {
  const db = await getDb();
  await deleteImagesForTrip(id);
  await db.delete('trips', id);
}
