import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trip, TravelogueData } from '../types/travelogue';
import type { ImportTrip } from '../utils/chronicleTransfer';
import {
  loadTravelogue,
  saveTripRecord,
  deleteTripRecord,
  replaceAllTrips,
} from '../db/travelogueDb';
import { deleteImages, saveImagesForTrip } from '../db/tripImages';

export type { Trip, TravelogueData };

export interface TripImageChanges {
  add: Blob[];
  removeIds: string[];
}

export function useTravelogueStore(initial: TravelogueData) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initial);
  const tripsRef = useRef<Trip[]>([]);
  initialRef.current = initial;
  tripsRef.current = trips;

  useEffect(() => {
    let cancelled = false;

    loadTravelogue(initialRef.current)
      .then((loaded) => {
        if (!cancelled) {
          setTrips(loaded.trips);
          setReady(true);
        }
      })
      .catch((err) => {
        console.error('[ivc] local travelogue load failed', err);
        if (!cancelled) {
          setTrips(initialRef.current.trips);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addTrip = useCallback(
    async (trip: Trip, imageChanges?: TripImageChanges) => {
      let imageIds = trip.imageIds ?? [];
      if (imageChanges?.removeIds.length) {
        await deleteImages(imageChanges.removeIds);
        imageIds = imageIds.filter((id) => !imageChanges.removeIds.includes(id));
      }
      if (imageChanges?.add.length) {
        const newIds = await saveImagesForTrip(trip.id, imageChanges.add);
        imageIds = [...imageIds, ...newIds];
      }

      const finalTrip = { ...trip, imageIds };
      setTrips((prev) => [...prev, finalTrip]);
      if (ready) await saveTripRecord(finalTrip);
    },
    [ready],
  );

  const updateTrip = useCallback(
    async (trip: Trip, imageChanges?: TripImageChanges) => {
      let imageIds = trip.imageIds ?? [];
      if (imageChanges?.removeIds.length) {
        await deleteImages(imageChanges.removeIds);
        imageIds = imageIds.filter((id) => !imageChanges.removeIds.includes(id));
      }
      if (imageChanges?.add.length) {
        const newIds = await saveImagesForTrip(trip.id, imageChanges.add);
        imageIds = [...imageIds, ...newIds];
      }

      const finalTrip = { ...trip, imageIds };
      setTrips((prev) => prev.map((t) => (t.id === finalTrip.id ? finalTrip : t)));
      if (ready) await saveTripRecord(finalTrip);
    },
    [ready],
  );

  const removeTrip = useCallback(
    async (id: string) => {
      setTrips((prev) => prev.filter((t) => t.id !== id));
      if (ready) await deleteTripRecord(id);
    },
    [ready],
  );

  const normalizeImported = useCallback(async (imported: ImportTrip[]) => {
    const normalized: Trip[] = [];
    for (const entry of imported) {
      const { importImages, ...tripFields } = entry;
      let imageIds: string[] = [];
      if (importImages?.length) {
        imageIds = await saveImagesForTrip(entry.id, importImages);
      }
      normalized.push({ ...tripFields, imageIds });
    }
    return normalized;
  }, []);

  const importTrips = useCallback(
    async (imported: ImportTrip[]) => {
      const normalized = await normalizeImported(imported);
      setTrips(normalized);
      if (ready) await replaceAllTrips(normalized);
    },
    [normalizeImported, ready],
  );

  const mergeImportTrips = useCallback(
    async (imported: ImportTrip[]) => {
      const prev = tripsRef.current;
      const existingIds = new Set(prev.map((t) => t.id));
      const toAdd = imported.filter((entry) => !existingIds.has(entry.id));
      const normalizedNew = await normalizeImported(toAdd);
      const merged = [...prev, ...normalizedNew];
      setTrips(merged);
      if (ready) await replaceAllTrips(merged);
      return { added: normalizedNew.length, kept: imported.length - toAdd.length };
    },
    [normalizeImported, ready],
  );

  const visitedCountryCodes = useCallback(
    () => [...new Set(trips.map((t) => t.countryCode.toLowerCase()))],
    [trips],
  );

  return {
    ready,
    trips,
    addTrip,
    updateTrip,
    removeTrip,
    importTrips,
    mergeImportTrips,
    visitedCountryCodes,
  };
}
