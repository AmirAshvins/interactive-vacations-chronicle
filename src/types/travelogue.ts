export interface Trip {
  id: string;
  countryCode: string;
  cityKey?: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  material: 'brass' | 'copper';
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
  images: string[];
}

export interface FlightRoute {
  id: string;
  fromTripId: string;
  toTripId: string;
}

export interface MapDisplaySettings {
  showFlightPaths: boolean;
  highlightVisited: boolean;
}

export interface TravelogueData {
  trips: Trip[];
}

export interface ChronicleExport {
  version: number;
  exportedAt: string;
  trips: Trip[];
}
