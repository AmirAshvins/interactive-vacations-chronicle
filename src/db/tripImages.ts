import { getDb } from './travelogueDb';

export interface StoredImage {
  id: string;
  tripId: string;
  blob: Blob;
  mimeType: string;
}

const urlCache = new Map<string, string>();

function newImageId(tripId: string): string {
  return `img-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveImagesForTrip(tripId: string, blobs: Blob[]): Promise<string[]> {
  if (!blobs.length) return [];
  const db = await getDb();
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
}

export async function deleteImages(imageIds: string[]): Promise<void> {
  if (!imageIds.length) return;
  const db = await getDb();
  const tx = db.transaction('images', 'readwrite');
  for (const id of imageIds) {
    revokeImageUrl(id);
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function deleteImagesForTrip(tripId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAllFromIndex('images', 'byTripId', tripId);
  await deleteImages(all.map((img) => img.id));
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  const db = await getDb();
  const record = await db.get('images', id);
  return record?.blob ?? null;
}

export async function getImageObjectUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await getImageBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
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
  const db = await getDb();
  await db.clear('images');
}

export function revokeImageUrl(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export function revokeAllImageUrls(): void {
  for (const url of urlCache.values()) {
    URL.revokeObjectURL(url);
  }
  urlCache.clear();
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
