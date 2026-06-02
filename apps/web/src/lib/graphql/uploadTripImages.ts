import { gqlRequest } from './client';
import {
  ATTACH_IMAGE,
  DETACH_IMAGE,
  REQUEST_IMAGE_UPLOAD,
} from './operations';
import type { ServerTrip } from './mappers';
import { saveImageBlob, saveRemoteImageMeta } from '../../db/tripImages';
import type { TripImageChanges } from '../../hooks/useTravelogueStore';
import { isServerImageId } from './imageUrls';

export async function uploadTripImage(
  accessToken: string,
  tripId: string,
  blob: Blob,
): Promise<ServerTrip> {
  const mimeType = blob.type || 'image/jpeg';
  const { requestImageUpload } = await gqlRequest<{
    requestImageUpload: {
      imageId: string;
      uploadUrl: string;
      publicUrl: string;
    };
  }>(
    REQUEST_IMAGE_UPLOAD,
    { tripId, mimeType, sizeBytes: blob.size },
    accessToken,
  );

  const { imageId, uploadUrl, publicUrl } = requestImageUpload;
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': mimeType },
  });
  if (!putRes.ok) {
    throw new Error(`Image upload failed (${putRes.status})`);
  }

  const { attachImage } = await gqlRequest<{ attachImage: ServerTrip }>(
    ATTACH_IMAGE,
    { tripId, imageId, clientMutationId: `img-${Date.now()}` },
    accessToken,
  );

  await saveImageBlob(imageId, tripId, blob, mimeType);
  await saveRemoteImageMeta(imageId, tripId, publicUrl);
  return attachImage;
}

export async function applySyncedImageChanges(
  accessToken: string,
  tripId: string,
  changes: TripImageChanges | undefined,
): Promise<ServerTrip | null> {
  if (!changes || (!changes.add.length && !changes.removeIds.length)) {
    return null;
  }

  let lastTrip: ServerTrip | null = null;

  for (const imageId of changes.removeIds) {
    if (!isServerImageId(imageId)) continue;
    const { detachImage } = await gqlRequest<{ detachImage: ServerTrip }>(
      DETACH_IMAGE,
      { tripId, imageId, clientMutationId: `img-rm-${Date.now()}` },
      accessToken,
    );
    lastTrip = detachImage;
  }

  for (const blob of changes.add) {
    lastTrip = await uploadTripImage(accessToken, tripId, blob);
  }

  return lastTrip;
}
