import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  detectEnvironment,
  resolveEnvironmentFlag,
  type DetectedEnvironment,
  type EnvironmentOverride,
  type PlatformKind,
} from '../utils/detectEnvironment';

export interface EnvironmentPreferences {
  tvInteraction: EnvironmentOverride;
  mobileLayout: EnvironmentOverride;
}

export interface EnvironmentState {
  detected: DetectedEnvironment;
  kind: PlatformKind;
  /** D-pad / remote focus navigation */
  tvInteraction: boolean;
  /** Bottom sheets, compact chrome, touch-first panels */
  mobileLayout: boolean;
  /** Pointer + keyboard desktop patterns */
  desktopLayout: boolean;
  tvInteractionOverride: EnvironmentOverride;
  mobileLayoutOverride: EnvironmentOverride;
  refreshDetection: () => void;
}

const RESIZE_DEBOUNCE_MS = 200;

export function useEnvironment(preferences: EnvironmentPreferences): EnvironmentState {
  const [detected, setDetected] = useState<DetectedEnvironment>(() => detectEnvironment());

  const refreshDetection = useCallback(() => {
    setDetected(detectEnvironment());
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(refreshDetection, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    const coarseMq = window.matchMedia('(pointer: coarse)');
    const onMqChange = () => refreshDetection();
    coarseMq.addEventListener('change', onMqChange);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      coarseMq.removeEventListener('change', onMqChange);
    };
  }, [refreshDetection]);

  const tvInteraction = useMemo(
    () =>
      resolveEnvironmentFlag(
        preferences.tvInteraction,
        detected.kind === 'tv',
      ),
    [preferences.tvInteraction, detected.kind],
  );

  const mobileLayout = useMemo(
    () =>
      resolveEnvironmentFlag(
        preferences.mobileLayout,
        detected.usesMobileViewport,
      ),
    [preferences.mobileLayout, detected.usesMobileViewport],
  );

  const desktopLayout = !tvInteraction && !mobileLayout;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.platform = detected.kind;
    root.classList.toggle('env-tv-interaction', tvInteraction);
    root.classList.toggle('env-mobile-layout', mobileLayout);
    root.classList.toggle('env-desktop-layout', desktopLayout);
    root.classList.toggle('env-detected-tv', detected.kind === 'tv');
    root.classList.toggle('env-detected-mobile', detected.kind === 'mobile');
    root.classList.toggle('env-detected-desktop', detected.kind === 'desktop');
  }, [detected.kind, tvInteraction, mobileLayout, desktopLayout]);

  return {
    detected,
    kind: detected.kind,
    tvInteraction,
    mobileLayout,
    desktopLayout,
    tvInteractionOverride: preferences.tvInteraction,
    mobileLayoutOverride: preferences.mobileLayout,
    refreshDetection,
  };
}
