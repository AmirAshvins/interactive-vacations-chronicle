import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { travelogues, tripImages, trips } from '../db/schema.js';
import { AppError, notFound } from '../lib/errors.js';
import { getMemberRole, requireRole } from './travelogue.js';
import * as tripService from './trip.js';
import {
  assertAllowedMime,
  buildStorageKey,
  getStorage,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_TRIP,
} from './storage/index.js';

async function countTripImages(db: Database, tripId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(tripImages)
    .where(eq(tripImages.tripId, tripId));
  return Number(row?.value ?? 0);
}

export async function getAttachedImageUrlsForTrip(db: Database, tripId: string): Promise<string[]> {
  const storage = getStorage();
  const rows = await db
    .select()
    .from(tripImages)
    .where(and(eq(tripImages.tripId, tripId), isNotNull(tripImages.attachedAt)))
    .orderBy(asc(tripImages.sortOrder), asc(tripImages.createdAt));
  return rows.map((r) => storage.getPublicUrl(r.storageKey));
}

export async function getAttachedImageUrlsForTrips(
  db: Database,
  tripIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!tripIds.length) return map;
  const storage = getStorage();
  const rows = await db
    .select()
    .from(tripImages)
    .where(and(inArray(tripImages.tripId, tripIds), isNotNull(tripImages.attachedAt)))
    .orderBy(asc(tripImages.sortOrder), asc(tripImages.createdAt));

  for (const row of rows) {
    if (!tripIds.includes(row.tripId)) continue;
    const list = map.get(row.tripId) ?? [];
    list.push(storage.getPublicUrl(row.storageKey));
    map.set(row.tripId, list);
  }
  return map;
}

async function bumpTripAfterImageChange(db: Database, tripId: string) {
  const [existing] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)))
    .limit(1);
  if (!existing) notFound('Trip not found');

  const [updated] = await db
    .update(trips)
    .set({
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(trips.id, tripId))
    .returning();

  if (!updated) throw new AppError('Failed to update trip', 'INTERNAL', 500);

  await db
    .update(travelogues)
    .set({
      version: sql`${travelogues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(travelogues.id, existing.travelogueId));

  return updated;
}

export async function requestImageUpload(
  db: Database,
  tripId: string,
  userId: string,
  mimeType: string,
  sizeBytes: number,
) {
  assertAllowedMime(mimeType);
  if (sizeBytes < 1 || sizeBytes > MAX_IMAGE_BYTES) {
    throw new AppError(`Image must be between 1 and ${MAX_IMAGE_BYTES} bytes`, 'BAD_REQUEST', 400);
  }

  const trip = await tripService.getTripById(db, tripId);
  if (!trip) notFound('Trip not found');

  const role = await getMemberRole(db, trip.travelogueId, userId);
  requireRole(role, 'editor');

  const imageCount = await countTripImages(db, tripId);
  if (imageCount >= MAX_IMAGES_PER_TRIP) {
    throw new AppError(`Maximum ${MAX_IMAGES_PER_TRIP} images per trip`, 'BAD_REQUEST', 400);
  }

  const imageId = crypto.randomUUID();
  const storageKey = buildStorageKey(trip.travelogueId, tripId, imageId, mimeType);
  const storage = getStorage();
  const { uploadUrl, expiresAt } = await storage.getPresignedPutUrl(storageKey, mimeType, sizeBytes);

  const [maxOrder] = await db
    .select({ value: sql<number>`coalesce(max(${tripImages.sortOrder}), -1)` })
    .from(tripImages)
    .where(eq(tripImages.tripId, tripId));

  await db.insert(tripImages).values({
    id: imageId,
    tripId,
    storageKey,
    mimeType,
    sizeBytes,
    sortOrder: Number(maxOrder?.value ?? -1) + 1,
  });

  return {
    imageId,
    uploadUrl,
    publicUrl: storage.getPublicUrl(storageKey),
    expiresAt,
  };
}

export async function attachImage(
  db: Database,
  tripId: string,
  imageId: string,
  userId: string,
) {
  const trip = await tripService.getTripById(db, tripId);
  if (!trip) notFound('Trip not found');

  const role = await getMemberRole(db, trip.travelogueId, userId);
  requireRole(role, 'editor');

  const [image] = await db
    .select()
    .from(tripImages)
    .where(and(eq(tripImages.id, imageId), eq(tripImages.tripId, tripId)))
    .limit(1);
  if (!image) notFound('Image not found');
  if (image.attachedAt) {
    return trip;
  }

  const storage = getStorage();
  const exists = await storage.headObject(image.storageKey);
  if (!exists) {
    throw new AppError('Upload not found in storage; PUT the file before attachImage', 'BAD_REQUEST', 400);
  }

  await db
    .update(tripImages)
    .set({ attachedAt: new Date() })
    .where(eq(tripImages.id, imageId));

  return bumpTripAfterImageChange(db, tripId);
}

export async function detachImage(
  db: Database,
  tripId: string,
  imageId: string,
  userId: string,
) {
  const trip = await tripService.getTripById(db, tripId);
  if (!trip) notFound('Trip not found');

  const role = await getMemberRole(db, trip.travelogueId, userId);
  requireRole(role, 'editor');

  const [image] = await db
    .select()
    .from(tripImages)
    .where(and(eq(tripImages.id, imageId), eq(tripImages.tripId, tripId)))
    .limit(1);
  if (!image) notFound('Image not found');

  const storage = getStorage();
  if (image.attachedAt) {
    await storage.deleteObject(image.storageKey);
  }
  await db.delete(tripImages).where(eq(tripImages.id, imageId));

  return bumpTripAfterImageChange(db, tripId);
}
