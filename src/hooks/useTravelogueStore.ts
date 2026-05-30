import { useState, useEffect, useCallback } from 'react';
import type { TravelPin, FlightRoute } from '../components/WorldMap';

export interface Memory {
  id: string;
  pinId: string;
  title: string;
  body: string;
  quote?: string;
  createdAt: string;
}

export interface TravelogueData {
  pins: TravelPin[];
  flights: FlightRoute[];
  memories: Memory[];
}

const STORAGE_KEY = 'bedrood-azizi-travelogue';

export function useTravelogueStore(initial: TravelogueData) {
  const [data, setData] = useState<TravelogueData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TravelogueData;
        return {
          pins: parsed.pins?.length ? parsed.pins : initial.pins,
          flights: parsed.flights?.length ? parsed.flights : initial.flights,
          memories: parsed.memories ?? initial.memories,
        };
      }
    } catch {
      /* use defaults */
    }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addFlight = useCallback((flight: FlightRoute) => {
    setData((prev) => ({ ...prev, flights: [...prev.flights, flight] }));
  }, []);

  const removeFlight = useCallback((id: string) => {
    setData((prev) => ({ ...prev, flights: prev.flights.filter((f) => f.id !== id) }));
  }, []);

  const addMemory = useCallback((memory: Omit<Memory, 'id' | 'createdAt'>) => {
    const entry: Memory = {
      ...memory,
      id: `mem-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, memories: [...prev.memories, entry] }));
    return entry;
  }, []);

  const updatePinDescription = useCallback((pinId: string, description: string) => {
    setData((prev) => ({
      ...prev,
      pins: prev.pins.map((p) => (p.id === pinId ? { ...p, description } : p)),
    }));
  }, []);

  const getMemoriesForPin = useCallback(
    (pinId: string) => data.memories.filter((m) => m.pinId === pinId),
    [data.memories],
  );

  return {
    pins: data.pins,
    flights: data.flights,
    memories: data.memories,
    addFlight,
    removeFlight,
    addMemory,
    updatePinDescription,
    getMemoriesForPin,
  };
}
