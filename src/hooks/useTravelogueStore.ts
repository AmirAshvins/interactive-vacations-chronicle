import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trip, TravelogueData } from '../types/travelogue';
import { loadTravelogue, saveTrip, deleteTrip, replaceAllTrips } from '../db/travelogueDb';

export type { Trip, TravelogueData };

export function useTravelogueStore(initial: TravelogueData) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    let cancelled = false;

    loadTravelogue(initialRef.current).then((loaded) => {
      if (!cancelled) {
        setTrips(loaded.trips);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const addTrip = useCallback((trip: Trip) => {
    setTrips((prev) => [...prev, trip]);
    if (ready) void saveTrip(trip);
  }, [ready]);

  const updateTrip = useCallback((trip: Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? trip : t)));
    if (ready) void saveTrip(trip);
  }, [ready]);

  const removeTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (ready) void deleteTrip(id);
  }, [ready]);

  const importTrips = useCallback((newTrips: Trip[]) => {
    setTrips(newTrips);
    if (ready) void replaceAllTrips(newTrips);
  }, [ready]);

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
    visitedCountryCodes,
  };
}
