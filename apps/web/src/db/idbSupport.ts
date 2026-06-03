import {
  deleteDB,
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type StoreNames,
} from 'idb';

const REPAIR_ATTEMPTS = 1;

export function storeExists(db: unknown, name: string): boolean {
  return (db as IDBDatabase).objectStoreNames.contains(name);
}

export function isIdbNotFoundError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === 'NotFoundError';
}

export function isIdbVersionError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === 'VersionError' || err.name === 'InvalidStateError';
}

export interface OpenAppDbOptions<DBTypes extends DBSchema> {
  name: string;
  version: number;
  requiredStores: StoreNames<DBTypes>[];
  upgrade: (
    db: IDBPDatabase<DBTypes>,
    oldVersion: number,
    newVersion: number | null,
    transaction: import('idb').IDBPTransaction<
      DBTypes,
      StoreNames<DBTypes>[],
      'versionchange'
    >,
  ) => void;
  /** Called after a full delete + reopen when schema repair runs */
  onRepaired?: () => void;
}

/**
 * Opens an IndexedDB with idempotent upgrades, blocked-connection handling,
 * and one automatic repair (delete + reopen) on missing object stores.
 */
export async function openAppDatabase<DBTypes extends DBSchema>(
  options: OpenAppDbOptions<DBTypes>,
  repairAttempt = 0,
): Promise<IDBPDatabase<DBTypes>> {
  const { name, version, requiredStores, upgrade, onRepaired } = options;

  try {
    const db = await openDB<DBTypes>(name, version, {
      upgrade,
      blocked() {
        console.warn(`[ivc/idb] "${name}" upgrade blocked — close other tabs using this app`);
      },
      blocking() {
        console.warn(`[ivc/idb] "${name}" is blocking an older connection — reload to finish upgrade`);
      },
      terminated() {
        console.warn(`[ivc/idb] "${name}" connection terminated unexpectedly`);
      },
    });

    for (const storeName of requiredStores) {
      if (!storeExists(db, String(storeName))) {
        throw new DOMException(
          `Object store "${storeName}" is missing after opening "${name}" v${db.version}`,
          'NotFoundError',
        );
      }
    }

    return db;
  } catch (err) {
    const missingStore =
      isIdbNotFoundError(err) ||
      (err instanceof DOMException && err.message.includes('Object store'));

    if (missingStore && repairAttempt < REPAIR_ATTEMPTS) {
      console.warn(`[ivc/idb] Repairing "${name}" (missing store or corrupt schema)`);
      try {
        await deleteDB(name);
      } catch {
        /* ignore */
      }
      onRepaired?.();
      return openAppDatabase(options, repairAttempt + 1);
    }

    throw err;
  }
}

/** Open an existing database without running version upgrades (legacy import). */
export async function openExistingDatabase<DBTypes extends DBSchema>(
  name: string,
): Promise<IDBPDatabase<DBTypes> | null> {
  if (typeof indexedDB === 'undefined') return null;

  try {
    return await openDB<DBTypes>(name);
  } catch {
    return null;
  }
}
