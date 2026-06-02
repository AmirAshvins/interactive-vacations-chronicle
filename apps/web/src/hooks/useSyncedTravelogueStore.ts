import { useCallback, useEffect, useRef, useState } from 'react';
import type { Trip } from '../types/travelogue';
import type { ImportTrip } from '../utils/chronicleTransfer';
import type { ChronicleImportResolution } from '../utils/chronicleImportResolve';
import { importChronicleToServer } from '../lib/graphql/importChronicleApi';
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
  SYNC_DELTA,
  TRAVELOGUE,
  UPDATE_TRIP,
} from '../lib/graphql/operations';
import type { MapDisplaySettings } from '../types/travelogue';
import type { TripImageChanges } from './useTravelogueStore';
import { applyTripPatch, type TripPatchMessage } from '../lib/graphql/applyTripPatch';
import { applySyncDeltaToTrips } from '../lib/graphql/applySyncDelta';
import { flushOutbox } from '../lib/graphql/flushOutbox';
import {
  persistTripsCache,
  queueTripCreate,
  queueTripDelete,
  queueTripUpdate,
} from '../lib/graphql/queueChange';
import {
  getSyncMeta,
  loadCachedTrips,
  outboxCount,
  setSyncMeta,
} from '../db/syncDb';
import { useTravelogueSubscription } from './useTravelogueSubscription';
import { useOnlineStatus, isLikelyNetworkError } from './useOnlineStatus';

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
  const isOnline = useOnlineStatus();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<SyncedTravelogueMeta | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const tripsRef = useRef<Trip[]>([]);
  const metaRef = useRef<SyncedTravelogueMeta | null>(null);
  tripsRef.current = trips;
  metaRef.current = meta;

  const refreshPendingCount = useCallback(async () => {
    const n = await outboxCount(travelogueId);
    setPendingSync(n);
  }, [travelogueId]);

  const applyServerTrips = useCallback(
    async (
      serverMeta: SyncedTravelogueMeta,
      serverTrips: ServerTrip[],
    ) => {
      await syncTripsImageCache(serverTrips);
      const mapped = serverTrips.map(serverTripToTrip);
      setMeta(serverMeta);
      setTrips(mapped);
      await persistTripsCache(travelogueId, mapped);
      await setSyncMeta({
        travelogueId,
        serverVersion: serverMeta.version,
        lastSyncedAt: new Date().toISOString(),
      });
    },
    [travelogueId],
  );

  const pullSyncDelta = useCallback(async () => {
    if (!accessToken) return;
    const localMeta = await getSyncMeta(travelogueId);
    const sinceVersion = localMeta?.serverVersion ?? 0;
    const data = await gqlRequest<{
      syncDelta: { travelogueVersion: number; patches: TripPatchMessage[] };
    }>(SYNC_DELTA, { travelogueId, sinceVersion }, accessToken);

    if (data.syncDelta.patches.length) {
      for (const p of data.syncDelta.patches) {
        if (p.trip) await syncTripsImageCache([p.trip]);
      }
      setTrips((prev) => applySyncDeltaToTrips(prev, data.syncDelta));
      const nextTrips = applySyncDeltaToTrips(tripsRef.current, data.syncDelta);
      await persistTripsCache(travelogueId, nextTrips);
    }

    if (metaRef.current) {
      const nextMeta = { ...metaRef.current, version: data.syncDelta.travelogueVersion };
      setMeta(nextMeta);
    }

    await setSyncMeta({
      travelogueId,
      serverVersion: data.syncDelta.travelogueVersion,
      lastSyncedAt: new Date().toISOString(),
    });
  }, [travelogueId, accessToken]);

  const tryFlushOutbox = useCallback(async () => {
    if (!accessToken || !isOnline) return;
    const result = await flushOutbox(travelogueId, accessToken, tripsRef.current);
    if (!result) return;

    setTrips(result.trips);
    await persistTripsCache(travelogueId, result.trips);
    if (metaRef.current) {
      setMeta({ ...metaRef.current, version: result.travelogueVersion });
    }
    if (result.conflicts > 0) {
      setSyncNotice('Some edits conflicted with the server — server version kept.');
    }
    await refreshPendingCount();
    await pullSyncDelta();
  }, [accessToken, isOnline, travelogueId, refreshPendingCount, pullSyncDelta]);

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

    await applyServerTrips(
      {
        id: data.travelogue.id,
        name: data.travelogue.name,
        homeCityKey: data.travelogue.homeCityKey,
        mapSettings: data.travelogue.mapSettings,
        version: data.travelogue.version,
      },
      data.travelogue.trips,
    );
  }, [travelogueId, accessToken, applyServerTrips]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    if (!accessToken) {
      setReady(true);
      return;
    }

    void (async () => {
      try {
        const cached = await loadCachedTrips(travelogueId);
        if (cached.length && !cancelled) {
          setTrips(cached);
        }
        await refreshPendingCount();

        if (isOnline) {
          await tryFlushOutbox();
          if (!cancelled) await reload();
        }
      } catch (err) {
        if (!cancelled) {
          const cached = await loadCachedTrips(travelogueId);
          if (cached.length) {
            setTrips(cached);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load travelogue');
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, travelogueId]);

  useEffect(() => {
    if (!ready || !accessToken || !isOnline) return;
    void tryFlushOutbox();
  }, [isOnline, ready, accessToken, tryFlushOutbox]);

  const applyRemotePatch = useCallback(
    (patch: TripPatchMessage) => {
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
        const nextTrips = applyTripPatch(tripsRef.current, patch);
        await persistTripsCache(travelogueId, nextTrips);
      })();
    },
    [travelogueId],
  );

  useTravelogueSubscription(travelogueId, accessToken, applyRemotePatch, ready && isOnline);

  useEffect(() => {
    if (!ready || !isOnline || !accessToken) return;
    void pullSyncDelta();
  }, [ready, isOnline, accessToken, pullSyncDelta]);

  const addTrip = useCallback(
    async (trip: Trip, imageChanges?: TripImageChanges) => {
      if (!accessToken) return;

      setTrips((prev) => [...prev, trip]);

      if (!isOnline) {
        await queueTripCreate(travelogueId, trip, imageChanges);
        await refreshPendingCount();
        return;
      }

      try {
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

        setTrips((prev) => {
          const next = [...prev.filter((t) => t.id !== trip.id), created];
          void persistTripsCache(travelogueId, next);
          return next;
        });
      } catch (err) {
        if (isLikelyNetworkError(err)) {
          await queueTripCreate(travelogueId, trip, imageChanges);
          await refreshPendingCount();
          return;
        }
        setTrips((prev) => prev.filter((t) => t.id !== trip.id));
        throw err;
      }
    },
    [accessToken, travelogueId, isOnline, refreshPendingCount],
  );

  const updateTrip = useCallback(
    async (trip: Trip, imageChanges?: TripImageChanges) => {
      if (!accessToken) return;

      const prevTrips = tripsRef.current;
      setTrips((p) => p.map((t) => (t.id === trip.id ? trip : t)));

      if (!isOnline) {
        await queueTripUpdate(travelogueId, trip, imageChanges);
        await refreshPendingCount();
        return;
      }

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

        setTrips((p) => {
          const next = p.map((t) => (t.id === updated.id ? updated : t));
          void persistTripsCache(travelogueId, next);
          return next;
        });
      } catch (err) {
        if (err instanceof GraphqlError && err.code === 'CONFLICT') {
          setSyncNotice('Edit conflict — loaded server version.');
          await reload();
          return;
        }
        if (isLikelyNetworkError(err)) {
          await queueTripUpdate(travelogueId, trip, imageChanges);
          await refreshPendingCount();
          return;
        }
        setTrips(prevTrips);
        throw err;
      }
    },
    [accessToken, travelogueId, isOnline, reload, refreshPendingCount],
  );

  const removeTrip = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      const trip = tripsRef.current.find((t) => t.id === id);
      const baseVersion = trip?.version ?? 1;
      const prevTrips = tripsRef.current;

      setTrips((p) => p.filter((t) => t.id !== id));

      if (!isOnline && trip) {
        await queueTripDelete(travelogueId, trip);
        await refreshPendingCount();
        return;
      }

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
        await persistTripsCache(travelogueId, tripsRef.current);
      } catch (err) {
        if (err instanceof GraphqlError && err.code === 'CONFLICT') {
          setSyncNotice('Delete conflict — refreshed from server.');
          await reload();
          return;
        }
        if (isLikelyNetworkError(err) && trip) {
          await queueTripDelete(travelogueId, trip);
          await refreshPendingCount();
          return;
        }
        setTrips(prevTrips);
        throw err;
      }
    },
    [accessToken, travelogueId, isOnline, reload, refreshPendingCount],
  );

  const importChronicle = useCallback(
    async (imported: ImportTrip[], resolution: ChronicleImportResolution) => {
      if (!accessToken) return;
      const tripsForExport = imported.map(({ importImages: _img, imageIds: _ids, ...fields }) => ({
        ...fields,
        imageIds: _ids ?? [],
      })) as Trip[];
      const next = await importChronicleToServer(
        accessToken,
        travelogueId,
        tripsForExport,
        resolution,
      );
      setTrips(next);
      tripsRef.current = next;
      await persistTripsCache(travelogueId, next);
    },
    [accessToken, travelogueId],
  );

  const importTrips = useCallback(
    async (imported: ImportTrip[]) => {
      await importChronicle(imported, 'replace');
    },
    [importChronicle],
  );

  const mergeImportTrips = useCallback(
    async (imported: ImportTrip[]) => {
      const prev = tripsRef.current;
      const existingIds = new Set(prev.map((t) => t.id));
      const toAdd = imported.filter((entry) => !existingIds.has(entry.id));
      await importChronicle(imported, 'merge');
      return { added: toAdd.length, kept: imported.length - toAdd.length };
    },
    [importChronicle],
  );

  const visitedCountryCodes = useCallback(
    () => [...new Set(trips.map((t) => t.countryCode.toLowerCase()))],
    [trips],
  );

  const dismissSyncNotice = useCallback(() => setSyncNotice(null), []);

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
    liveSync: isOnline,
    isOnline,
    pendingSync,
    syncNotice,
    dismissSyncNotice,
  };
}
