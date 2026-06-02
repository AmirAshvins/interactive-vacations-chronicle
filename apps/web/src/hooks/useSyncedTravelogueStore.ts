import { useCallback, useEffect, useRef, useState } from 'react';
import type { Trip } from '../types/travelogue';
import type { ImportTrip } from '../utils/chronicleTransfer';
import { gqlRequest, GraphqlError } from '../lib/graphql/client';
import {
  serverTripToTrip,
  serverTripToTripWithCache,
  tripToInput,
  type ServerTrip,
} from '../lib/graphql/mappers';
import { syncTripsImageCache } from '../lib/graphql/syncImageCache';
import { applySyncedImageChanges } from '../lib/graphql/uploadTripImages';
import { deleteImages } from '../db/tripImages';
import { isServerImageId } from '../lib/graphql/imageUrls';
import {
  CREATE_TRIP,
  DELETE_TRIP,
  TRAVELOGUE,
  UPDATE_TRIP,
} from '../lib/graphql/operations';
import type { MapDisplaySettings } from '../types/travelogue';
import type { TripImageChanges } from './useTravelogueStore';
import { applyTripPatch, type TripPatchMessage } from '../lib/graphql/applyTripPatch';
import { useTravelogueSubscription } from './useTravelogueSubscription';

export type { Trip };

export interface SyncedTravelogueMeta {
  id: string;
  name: string;
  homeCityKey: string;
  mapSettings: MapDisplaySettings;
  version: number;
}

let mutationCounter = 0;
function nextMutationId() {
  mutationCounter += 1;
  return `web-${Date.now()}-${mutationCounter}`;
}

export function useSyncedTravelogueStore(travelogueId: string, accessToken: string | null) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<SyncedTravelogueMeta | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tripsRef = useRef<Trip[]>([]);
  tripsRef.current = trips;

  const reload = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    const data = await gqlRequest<{
      travelogue: {
        id: string;
        name: string;
        homeCityKey: string;
        mapSettings: MapDisplaySettings;
        version: number;
        trips: ServerTrip[];
      };
    }>(TRAVELOGUE, { id: travelogueId }, accessToken);

    await syncTripsImageCache(data.travelogue.trips);

    setMeta({
      id: data.travelogue.id,
      name: data.travelogue.name,
      homeCityKey: data.travelogue.homeCityKey,
      mapSettings: data.travelogue.mapSettings,
      version: data.travelogue.version,
    });
    setTrips(data.travelogue.trips.map(serverTripToTrip));
  }, [travelogueId, accessToken]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    if (!accessToken) {
      setReady(true);
      return;
    }

    reload()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load travelogue');
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, reload]);

  const applyRemotePatch = useCallback((patch: TripPatchMessage) => {
    void (async () => {
      if (patch.trip) await syncTripsImageCache([patch.trip]);
      setTrips((prev) => {
        const next = applyTripPatch(prev, patch);
        if (patch.op === 'DELETED') return next;
        const incomingVersion = patch.version;
        const existing = prev.find((t) => t.id === patch.tripId);
        if (existing && (existing.version ?? 0) >= incomingVersion) return prev;
        return next;
      });
    })();
  }, []);

  useTravelogueSubscription(travelogueId, accessToken, applyRemotePatch, ready);

  const addTrip = useCallback(
    async (trip: Trip, imageChanges?: TripImageChanges) => {
      if (!accessToken) return;

      const data = await gqlRequest<{ createTrip: ServerTrip }>(
        CREATE_TRIP,
        {
          travelogueId,
          input: tripToInput(trip),
          clientMutationId: nextMutationId(),
        },
        accessToken,
      );

      let created = await serverTripToTripWithCache(data.createTrip);

      if (imageChanges?.add.length) {
        const afterImages = await applySyncedImageChanges(accessToken, created.id, imageChanges);
        if (afterImages) {
          created = await serverTripToTripWithCache(afterImages);
        }
      }

      setTrips((prev) => [...prev, created]);
    },
    [accessToken, travelogueId],
  );

  const updateTrip = useCallback(
    async (trip: Trip, imageChanges?: TripImageChanges) => {
      if (!accessToken) return;

      const baseVersion = trip.version ?? 1;
      try {
        const data = await gqlRequest<{ updateTrip: ServerTrip }>(
          UPDATE_TRIP,
          {
            id: trip.id,
            input: tripToInput(trip),
            baseVersion,
            clientMutationId: nextMutationId(),
          },
          accessToken,
        );

        let updated = await serverTripToTripWithCache(data.updateTrip);

        if (imageChanges?.removeIds.length) {
          const localOnly = imageChanges.removeIds.filter((id) => !isServerImageId(id));
          if (localOnly.length) await deleteImages(localOnly);
        }

        if (imageChanges && (imageChanges.add.length || imageChanges.removeIds.length)) {
          const afterImages = await applySyncedImageChanges(accessToken, trip.id, imageChanges);
          if (afterImages) {
            updated = await serverTripToTripWithCache(afterImages);
          }
        }

        setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch (err) {
        if (err instanceof GraphqlError && err.code === 'CONFLICT') {
          await reload();
        }
        throw err;
      }
    },
    [accessToken, reload],
  );

  const removeTrip = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      const trip = tripsRef.current.find((t) => t.id === id);
      const baseVersion = trip?.version ?? 1;

      try {
        await gqlRequest(
          DELETE_TRIP,
          {
            id,
            baseVersion,
            clientMutationId: nextMutationId(),
          },
          accessToken,
        );
        setTrips((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        if (err instanceof GraphqlError && err.code === 'CONFLICT') {
          await reload();
        }
        throw err;
      }
    },
    [accessToken, reload],
  );

  const importTrips = useCallback(
    async (imported: ImportTrip[]) => {
      for (const entry of imported) {
        const { importImages: _img, imageIds: _ids, ...fields } = entry;
        await addTrip({ ...fields, imageIds: [] } as Trip);
      }
    },
    [addTrip],
  );

  const mergeImportTrips = useCallback(
    async (imported: ImportTrip[]) => {
      const prev = tripsRef.current;
      const existingIds = new Set(prev.map((t) => t.id));
      const toAdd = imported.filter((entry) => !existingIds.has(entry.id));
      for (const entry of toAdd) {
        const { importImages: _img, imageIds: _ids, ...fields } = entry;
        await addTrip({ ...fields, imageIds: [] } as Trip);
      }
      return { added: toAdd.length, kept: imported.length - toAdd.length };
    },
    [addTrip],
  );

  const visitedCountryCodes = useCallback(
    () => [...new Set(trips.map((t) => t.countryCode.toLowerCase()))],
    [trips],
  );

  return {
    ready,
    error,
    meta,
    trips,
    reload,
    addTrip,
    updateTrip,
    removeTrip,
    importTrips,
    mergeImportTrips,
    visitedCountryCodes,
    liveSync: true,
  };
}
