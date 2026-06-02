export type MapPinStyleId = 'needle-red' | 'needle-blue' | 'needle-copper' | 'dot-classic';

export interface MapPinStyleOption {
  id: MapPinStyleId;
  label: string;
  description: string;
}

export const MAP_PIN_STYLES: MapPinStyleOption[] = [
  { id: 'needle-red', label: 'Red pin', description: 'Classic map push pin' },
  { id: 'needle-blue', label: 'Navy pin', description: 'Royal navy head' },
  { id: 'needle-copper', label: 'Copper pin', description: 'Deep copper for home legs' },
  { id: 'dot-classic', label: 'Minimal dot', description: 'Small flat marker' },
];

export const DEFAULT_MAP_PIN_STYLE: MapPinStyleId = 'needle-red';

export function isMapPinStyleId(value: string): value is MapPinStyleId {
  return MAP_PIN_STYLES.some((s) => s.id === value);
}

/** Migrate legacy saved style ids. */
export function normalizeMapPinStyleId(value: string | undefined): MapPinStyleId {
  if (value === 'needle-brass') return 'needle-blue';
  if (value && isMapPinStyleId(value)) return value;
  return DEFAULT_MAP_PIN_STYLE;
}

/** Pin anchor sits at the needle tip (0, 0); head extends upward (negative y). */
export interface NeedlePinColors {
  head: string;
  headHighlight: string;
  flange: string;
  needle: string;
}

export function needleColorsForTrip(
  styleId: MapPinStyleId,
  isCopper: boolean,
): NeedlePinColors {
  if (styleId === 'needle-blue') {
    return {
      head: '#1a3352',
      headHighlight: '#3d5f8a',
      flange: '#122640',
      needle: '#94a3b8',
    };
  }
  if (styleId === 'needle-copper' || isCopper) {
    return {
      head: '#9a3412',
      headHighlight: '#c2410c',
      flange: '#7c2d12',
      needle: '#94a3b8',
    };
  }
  return {
    head: '#dc2626',
    headHighlight: '#ef4444',
    flange: '#b91c1c',
    needle: '#cbd5e1',
  };
}
