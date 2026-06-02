import { buildMapPinSvgMarkup, mapPinSvgCacheKey, type MapPinSvgOptions } from '../utils/mapPinSvgMarkup';
import type { MapPinStyleId } from '../data/mapPinStyles';

const RASTER_SCALE = 3;
const PIN_DRAW_WIDTH = 28;
const PIN_DRAW_HEIGHT = 38;
const PIN_ANCHOR_X = 14;
const PIN_ANCHOR_Y = 34;

interface CacheEntry {
  image: HTMLImageElement;
  ready: boolean;
  url: string;
}

const cache = new Map<string, CacheEntry>();
const pendingRedraws = new Set<() => void>();

function notifyRedraws() {
  for (const fn of pendingRedraws) {
    fn();
  }
}

export function subscribePinBitmapRedraw(fn: () => void): () => void {
  pendingRedraws.add(fn);
  return () => pendingRedraws.delete(fn);
}

export function getPinBitmap(
  options: MapPinSvgOptions,
): { image: HTMLImageElement; drawWidth: number; drawHeight: number; anchorX: number; anchorY: number } | null {
  const key = mapPinSvgCacheKey(options);
  let entry = cache.get(key);

  if (!entry) {
    const svg = buildMapPinSvgMarkup(options);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    entry = { image, ready: false, url };
    cache.set(key, entry);

    image.onload = () => {
      entry!.ready = true;
      notifyRedraws();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      cache.delete(key);
    };
    image.src = url;
  }

  if (!entry.ready) return null;

  return {
    image: entry.image,
    drawWidth: PIN_DRAW_WIDTH,
    drawHeight: PIN_DRAW_HEIGHT,
    anchorX: PIN_ANCHOR_X,
    anchorY: PIN_ANCHOR_Y,
  };
}

/** Warm common pin variants when style or theme changes. */
export function preloadPinStyleVariants(pinStyle: MapPinStyleId, isDarkPhase: boolean): void {
  const base: MapPinSvgOptions = {
    pinStyle,
    isDarkPhase,
    isCopper: false,
    selected: false,
    tvFocused: false,
    stackCount: 1,
  };

  getPinBitmap(base);
  getPinBitmap({ ...base, isCopper: true });
  getPinBitmap({ ...base, selected: true });
  if (pinStyle !== 'dot-classic') {
    getPinBitmap({ ...base, stackCount: 2 });
  }
}

export function clearPinBitmapCache(): void {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  cache.clear();
}

export const PIN_BITMAP_RASTER_SCALE = RASTER_SCALE;
