import { useCallback, useEffect, useState } from 'react';
import type { MapDisplaySettings } from '../types/travelogue';
import type { EnvironmentOverride } from '../utils/detectEnvironment';

const APP_SETTINGS_KEY = 'bedrood-azizi-app-settings';

export type MaterialMode = 'oak' | 'cork' | 'walnut' | 'auto';

export interface AppSettings {
  materialMode: MaterialMode;
  /** Auto-hide HUD after idle (living-room display) */
  isTvScreensaver: boolean;
  /** D-pad / remote focus navigation — `auto` follows detected TV platform */
  tvInteraction: EnvironmentOverride;
  /** Bottom-sheet layout, compact chrome — `auto` follows detected mobile */
  mobileLayout: EnvironmentOverride;
  homeCityKey: string;
  map: MapDisplaySettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  materialMode: 'auto',
  isTvScreensaver: true,
  /** `on` while building TV focus nav — switch to `auto` when shipping */
  tvInteraction: 'on',
  mobileLayout: 'auto',
  homeCityKey: 'toronto',
  map: {
    showFlightPaths: true,
    highlightVisited: true,
  },
};

function migrateSettings(parsed: Partial<AppSettings> & { isTvMode?: boolean }): AppSettings {
  const isTvScreensaver =
    parsed.isTvScreensaver ?? parsed.isTvMode ?? DEFAULT_SETTINGS.isTvScreensaver;

  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    isTvScreensaver,
    tvInteraction: parsed.tvInteraction ?? DEFAULT_SETTINGS.tvInteraction,
    mobileLayout: parsed.mobileLayout ?? DEFAULT_SETTINGS.mobileLayout,
    map: { ...DEFAULT_SETTINGS.map, ...parsed.map },
  };
}

function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      return migrateSettings(JSON.parse(raw) as Partial<AppSettings> & { isTvMode?: boolean });
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

  const setTvScreensaver = useCallback((isTvScreensaver: boolean) => {
    setSettings((s) => ({ ...s, isTvScreensaver }));
  }, []);

  const setTvInteraction = useCallback((tvInteraction: EnvironmentOverride) => {
    setSettings((s) => ({ ...s, tvInteraction }));
  }, []);

  const setMobileLayout = useCallback((mobileLayout: EnvironmentOverride) => {
    setSettings((s) => ({ ...s, mobileLayout }));
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
    isTvScreensaver: settings.isTvScreensaver,
    tvInteraction: settings.tvInteraction,
    mobileLayout: settings.mobileLayout,
    homeCityKey: settings.homeCityKey,
    mapSettings: settings.map,
    setMaterialMode,
    setTvScreensaver,
    setTvInteraction,
    setMobileLayout,
    setHomeCityKey,
    setMapSettings,
  };
}
