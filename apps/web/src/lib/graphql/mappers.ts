import type { MapDisplaySettings, Trip } from '../../types/travelogue';

export interface ServerTrip {
  id: string;
  countryCode: string;
  cityKey?: string | null;
  name: string;
  lat: number;
  lng: number;
  description: string;
  material: 'brass' | 'copper';
  startYear?: number | null;
  startMonth?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  version: number;
  imageUrls: string[];
  updatedAt: string;
}

export function serverTripToTrip(t: ServerTrip): Trip {
  return {
    id: t.id,
    countryCode: t.countryCode,
    cityKey: t.cityKey ?? undefined,
    name: t.name,
    lat: t.lat,
    lng: t.lng,
    description: t.description,
    material: t.material,
    startYear: t.startYear ?? undefined,
    startMonth: t.startMonth ?? undefined,
    endYear: t.endYear ?? undefined,
    endMonth: t.endMonth ?? undefined,
    imageIds: [],
    version: t.version,
  };
}

export function tripToInput(trip: Trip) {
  return {
    countryCode: trip.countryCode,
    cityKey: trip.cityKey ?? null,
    name: trip.name,
    lat: trip.lat,
    lng: trip.lng,
    description: trip.description,
    material: trip.material,
    startYear: trip.startYear ?? null,
    startMonth: trip.startMonth ?? null,
    endYear: trip.endYear ?? null,
    endMonth: trip.endMonth ?? null,
  };
}

export function serverMapSettings(s: MapDisplaySettings): MapDisplaySettings {
  return {
    showFlightPaths: s.showFlightPaths,
    highlightVisited: s.highlightVisited,
  };
}
