import { isIdbNotFoundError } from './idbSupport';
import { getDb } from './travelogueDb';

export interface StoredImage {
  id: string;
  tripId: string;
  blob?: Blob;
  mimeType: string;
  remoteUrl?: string;
}

const urlCache = new Map<string, string>();

function newImageId(tripId: string): string {
  return `img-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function withImagesStore<T>(fn: (db: Awaited<ReturnType<typeof getDb>>) => Promise<T>): Promise<T> {
  try {
    const db = await getDb();
    return await fn(db);
  } catch (err) {
    if (isIdbNotFoundError(err)) {
      console.error('[ivc/idb] images store unavailable', err);
    }
    throw err;
  }
}

export async function saveImagesForTrip(tripId: string, blobs: Blob[]): Promise<string[]> {
  if (!blobs.length) return [];
  return withImagesStore(async (db) => {
    const ids: string[] = [];
    const tx = db.transaction('images', 'readwrite');
    for (const blob of blobs) {
      const id = newImageId(tripId);
      await tx.store.put({
        id,
        tripId,
        blob,
        mimeType: blob.type || 'image/jpeg',
      });
      ids.push(id);
    }
    await tx.done;
    return ids;
  });
}

export async function saveImageBlob(
  id: string,
  tripId: string,
  blob: Blob,
  mimeType = blob.type || 'image/jpeg',
): Promise<void> {
  await withImagesStore(async (db) => {
    const existing = await db.get('images', id);
    await db.put('images', {
      id,
      tripId,
      blob,
      mimeType,
      remoteUrl: existing?.remoteUrl,
    });
  });
}

export async function saveRemoteImageMeta(
  id: string,
  tripId: string,
  remoteUrl: string,
): Promise<void> {
  await withImagesStore(async (db) => {
    const existing = await db.get('images', id);
    await db.put('images', {
      id,
      tripId,
      blob: existing?.blob,
      mimeType: existing?.mimeType ?? 'image/jpeg',
      remoteUrl,
    });
  });
}

export async function deleteImages(imageIds: string[]): Promise<void> {
  if (!imageIds.length) return;
  await withImagesStore(async (db) => {
    const tx = db.transaction('images', 'readwrite');
    for (const id of imageIds) {
      revokeImageUrl(id);
      await tx.store.delete(id);
    }
    await tx.done;
  });
}

export async function deleteImagesForTrip(tripId: string): Promise<void> {
  await withImagesStore(async (db) => {
    const all = await db.getAllFromIndex('images', 'byTripId', tripId);
    await deleteImages(all.map((img) => img.id));
  });
}

export async function getImageRecord(id: string): Promise<StoredImage | null> {
  return withImagesStore(async (db) => {
    const record = await db.get('images', id);
    return record ?? null;
  });
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  const record = await getImageRecord(id);
  return record?.blob ?? null;
}

async function fetchAndCacheRemote(id: string, remoteUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const record = await getImageRecord(id);
    if (record) {
      await saveImageBlob(id, record.tripId, blob, blob.type || record.mimeType);
    }
    return blob;
  } catch {
    return null;
  }
}

export async function getImageObjectUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;

  const record = await getImageRecord(id);
  if (!record) return null;

  if (record.blob) {
    const url = URL.createObjectURL(record.blob);
    urlCache.set(id, url);
    return url;
  }

  if (record.remoteUrl) {
    const blob = await fetchAndCacheRemote(id, record.remoteUrl);
    if (blob) {
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      return url;
    }
    return record.remoteUrl;
  }

  return null;
}

export async function resolveImageIdsToDataUrls(imageIds: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const id of imageIds) {
    const blob = await getImageBlob(id);
    if (!blob) continue;
    urls.push(await blobToDataUrl(blob));
  }
  return urls;
}

export async function persistDataUrlsAsImages(tripId: string, dataUrls: string[]): Promise<string[]> {
  const blobs: Blob[] = [];
  for (const dataUrl of dataUrls) {
    const blob = await dataUrlToBlob(dataUrl);
    if (blob) blobs.push(blob);
  }
  return saveImagesForTrip(tripId, blobs);
}

export async function clearAllImages(): Promise<void> {
  revokeAllImageUrls();
  await withImagesStore(async (db) => {
    await db.clear('images');
  });
}

export function revokeImageUrl(id: string): void {
  const url = urlCache.get(id);
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
  urlCache.delete(id);
}

export function revokeAllImageUrls(): void {
  for (const [id, url] of urlCache.entries()) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return null;
  }
}
