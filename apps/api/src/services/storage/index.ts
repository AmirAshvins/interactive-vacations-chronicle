import { env } from '../../env.js';
import { createLocalStorage } from './local.js';
import { createR2Storage } from './r2.js';
import type { StorageAdapter } from './types.js';

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    adapter = env.storageMode === 'r2' ? createR2Storage() : createLocalStorage();
  }
  return adapter;
}

export function buildStorageKey(
  travelogueId: string,
  tripId: string,
  imageId: string,
  mimeType: string,
): string {
  const ext = mimeToExtension(mimeType);
  return `images/${travelogueId}/${tripId}/${imageId}.${ext}`;
}

export function mimeToExtension(mimeType: string): string {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function assertAllowedMime(mimeType: string): void {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_TRIP = 20;
