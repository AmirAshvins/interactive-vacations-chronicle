import { useState, useEffect, useCallback } from 'react';
import type { MapDisplaySettings } from '../types/travelogue';

const APP_SETTINGS_KEY = 'bedrood-azizi-app-settings';

export type MaterialMode = 'oak' | 'cork' | 'walnut' | 'auto';

export interface AppSettings {
  materialMode: MaterialMode;
  isTvMode: boolean;
  homeCityKey: string;
  map: MapDisplaySettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  materialMode: 'auto',
  isTvMode: true,
  homeCityKey: 'toronto',
  map: {
    showFlightPaths: true,
    highlightVisited: true,
  },
};

function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        map: { ...DEFAULT_SETTINGS.map, ...parsed.map },
      };
    }
  } catch {
    /* defaults */
  }

  return DEFAULT_SETTINGS;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);

  useEffect(() => {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const setMaterialMode = useCallback((materialMode: MaterialMode) => {
    setSettings((s) => ({ ...s, materialMode }));
  }, []);

  const setIsTvMode = useCallback((isTvMode: boolean) => {
    setSettings((s) => ({ ...s, isTvMode }));
  }, []);

  const setMapSettings = useCallback((map: MapDisplaySettings | ((prev: MapDisplaySettings) => MapDisplaySettings)) => {
    setSettings((s) => ({
      ...s,
      map: typeof map === 'function' ? map(s.map) : map,
    }));
  }, []);

  const setHomeCityKey = useCallback((homeCityKey: string) => {
    setSettings((s) => ({ ...s, homeCityKey }));
  }, []);

  return {
    materialMode: settings.materialMode,
    isTvMode: settings.isTvMode,
    homeCityKey: settings.homeCityKey,
    mapSettings: settings.map,
    setMaterialMode,
    setIsTvMode,
    setHomeCityKey,
    setMapSettings,
  };
}
