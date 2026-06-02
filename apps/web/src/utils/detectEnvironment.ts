/** Viewport / input profile used to pick layout and interaction mode. */
export type PlatformKind = 'tv' | 'mobile' | 'desktop';

export type EnvironmentOverride = 'auto' | 'on' | 'off';

export interface DetectedEnvironment {
  kind: PlatformKind;
  /** Human-readable hint for settings UI */
  label: string;
  isTouch: boolean;
  isCoarsePointer: boolean;
  isNarrowViewport: boolean;
  isWideViewport: boolean;
  /** Narrow viewport — drives bottom-sheet layout (Auto), independent of user agent */
  usesMobileViewport: boolean;
  tvUaHint: string | null;
}

const MOBILE_UA =
  /android|webos|iphone|ipod|blackberry|iemobile|opera mini|mobile/i;
const TV_UA =
  /smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast|viera|bravia|tizen|web0s|webos|crkey|aftb|aftm|firetv|roku|philips|hisense|sonyceb|nintendo wiiu/i;
const TABLET_UA = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i;

const MOBILE_LAYOUT_BREAKPOINT_PX = 768;
const TV_MIN_WIDTH_PX = 960;

/** Viewport width below which mobile (bottom-sheet) layout applies in Auto mode */
export const MOBILE_VIEWPORT_MAX_PX = MOBILE_LAYOUT_BREAKPOINT_PX - 1;

function readViewportWidth(): number {
  if (typeof window === 'undefined') return 1920;
  return window.innerWidth;
}

function matchTvUa(ua: string): string | null {
  const match = ua.match(TV_UA);
  return match ? match[0] : null;
}

/**
 * Heuristic platform detection — not perfect, but good enough for auto layout.
 * TV: known TV user agents, or large screen + coarse pointer + no fine hover.
 */
export function detectEnvironment(): DetectedEnvironment {
  if (typeof window === 'undefined') {
    return {
      kind: 'desktop',
      label: 'Desktop (SSR)',
      isTouch: false,
      isCoarsePointer: false,
      isNarrowViewport: false,
      isWideViewport: true,
      usesMobileViewport: false,
      tvUaHint: null,
    };
  }

  const ua = navigator.userAgent;
  const width = readViewportWidth();
  const isNarrowViewport = width < MOBILE_LAYOUT_BREAKPOINT_PX;
  const isWideViewport = width >= TV_MIN_WIDTH_PX;
  const usesMobileViewport = isNarrowViewport;

  const coarseMq = window.matchMedia('(pointer: coarse)').matches;
  const fineMq = window.matchMedia('(pointer: fine)').matches;
  const hoverMq = window.matchMedia('(hover: hover)').matches;
  const tvDisplayMq = window.matchMedia('(display-mode: tv)').matches;
  const isTouch =
    coarseMq ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0;

  const tvUaHint = matchTvUa(ua);
  const isTablet = TABLET_UA.test(ua);

  const tvHeuristic =
    Boolean(tvUaHint) ||
    tvDisplayMq ||
    (isWideViewport && coarseMq && !fineMq && !hoverMq);

  if (tvHeuristic) {
    return {
      kind: 'tv',
      label: tvUaHint ? `TV (${tvUaHint})` : 'TV (display heuristics)',
      isTouch: true,
      isCoarsePointer: coarseMq,
      isNarrowViewport,
      isWideViewport,
      usesMobileViewport,
      tvUaHint,
    };
  }

  if (usesMobileViewport) {
    return {
      kind: 'mobile',
      label: `Phone layout (${width}px viewport)`,
      isTouch,
      isCoarsePointer: coarseMq,
      isNarrowViewport,
      isWideViewport,
      usesMobileViewport,
      tvUaHint: null,
    };
  }

  if (MOBILE_UA.test(ua) && !isTablet && !usesMobileViewport) {
    return {
      kind: 'desktop',
      label: `Tablet / wide (${width}px viewport)`,
      isTouch,
      isCoarsePointer: coarseMq,
      isNarrowViewport,
      isWideViewport,
      usesMobileViewport,
      tvUaHint: null,
    };
  }

  return {
    kind: 'desktop',
    label: `Desktop layout (${width}px viewport)`,
    isTouch,
    isCoarsePointer: coarseMq,
    isNarrowViewport,
    isWideViewport,
    usesMobileViewport,
    tvUaHint: null,
  };
}

export function resolveEnvironmentFlag(
  override: EnvironmentOverride,
  detectedActive: boolean,
): boolean {
  if (override === 'on') return true;
  if (override === 'off') return false;
  return detectedActive;
}
