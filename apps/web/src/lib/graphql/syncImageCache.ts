import { saveRemoteImageMeta } from '../../db/tripImages';
import { imageIdFromPublicUrl } from './imageUrls';
import type { ServerTrip } from './mappers';

export async function syncTripImageCache(trip: ServerTrip): Promise<void> {
  for (const url of trip.imageUrls) {
    const imageId = imageIdFromPublicUrl(url);
    if (!imageId) continue;
    await saveRemoteImageMeta(imageId, trip.id, url);
  }
}

export async function syncTripsImageCache(trips: ServerTrip[]): Promise<void> {
  await Promise.all(trips.map((t) => syncTripImageCache(t)));
}
