import { useCallback, useEffect, useState } from 'react';
import type { Trip } from '../types/travelogue';
import type { MapDisplaySettings } from '../types/travelogue';
import { gqlRequest } from '../lib/graphql/client';
import { serverTripToTrip, type ServerTrip } from '../lib/graphql/mappers';
import { syncTripsImageCache } from '../lib/graphql/syncImageCache';
import { TRAVELOGUE } from '../lib/graphql/operations';
import { applyTripPatch, type TripPatchMessage } from '../lib/graphql/applyTripPatch';
import { useTravelogueSubscription } from './useTravelogueSubscription';

export interface TvDisplayMeta {
  id: string;
  name: string;
  homeCityKey: string;
  mapSettings: MapDisplaySettings;
  version: number;
}

export function useTvDisplayStore(travelogueId: string, deviceToken: string | null) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<TvDisplayMeta | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!deviceToken) return;
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
    }>(TRAVELOGUE, { id: travelogueId }, deviceToken);

    await syncTripsImageCache(data.travelogue.trips);
    setMeta({
      id: data.travelogue.id,
      name: data.travelogue.name,
      homeCityKey: data.travelogue.homeCityKey,
      mapSettings: data.travelogue.mapSettings,
      version: data.travelogue.version,
    });
    setTrips(data.travelogue.trips.map(serverTripToTrip));
  }, [travelogueId, deviceToken]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!deviceToken) {
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
  }, [deviceToken, reload]);

  const applyRemotePatch = useCallback((patch: TripPatchMessage) => {
    void (async () => {
      if (patch.trip) await syncTripsImageCache([patch.trip]);
      setTrips((prev) => {
        const next = applyTripPatch(prev, patch);
        if (patch.op === 'DELETED') return next;
        const existing = prev.find((t) => t.id === patch.tripId);
        if (existing && (existing.version ?? 0) >= patch.version) return prev;
        return next;
      });
    })();
  }, []);

  useTravelogueSubscription(travelogueId, deviceToken, applyRemotePatch, ready);

  const visitedCountryCodes = useCallback(
    () => [...new Set(trips.map((t) => t.countryCode.toLowerCase()))],
    [trips],
  );

  const noop = async () => {};

  return {
    ready,
    error,
    meta,
    trips,
    reload,
    addTrip: noop,
    updateTrip: noop,
    removeTrip: noop,
    importTrips: noop,
    mergeImportTrips: async () => ({ added: 0, kept: 0 }),
    visitedCountryCodes,
    liveSync: true,
  };
}
