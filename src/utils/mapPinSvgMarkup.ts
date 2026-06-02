import type { MapPinStyleId } from '../data/mapPinStyles';
import { needleColorsForTrip } from '../data/mapPinStyles';

export interface MapPinSvgOptions {
  pinStyle: MapPinStyleId;
  isCopper: boolean;
  selected: boolean;
  tvFocused: boolean;
  stackCount: number;
  isDarkPhase: boolean;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function needleBodyMarkup(
  colors: ReturnType<typeof needleColorsForTrip>,
  selected: boolean,
  tvFocused: boolean,
): string {
  const ring =
    selected || tvFocused
      ? `<ellipse cx="0" cy="-20.4" rx="7.2" ry="6.4" fill="none" stroke="${tvFocused ? '#fde047' : 'rgba(255,255,255,0.95)'}" stroke-width="1.4"/>`
      : '';

  return `
    <path d="M0,0 L0.55,-14.5 L0,-15.2 L-0.55,-14.5 Z" fill="${colors.needle}" stroke="rgba(15,23,42,0.25)" stroke-width="0.35"/>
    <ellipse cx="0" cy="-15.8" rx="4.8" ry="1.15" fill="${colors.flange}" opacity="0.95"/>
    <rect x="-0.55" y="-18.2" width="1.1" height="2.6" rx="0.35" fill="${colors.flange}"/>
    <ellipse cx="0" cy="-20.4" rx="5.6" ry="4.9" fill="${colors.head}"/>
    <ellipse cx="-1.4" cy="-21.8" rx="2.2" ry="1.6" fill="${colors.headHighlight}" opacity="0.55"/>
    ${ring}
  `;
}

function dotBodyMarkup(options: MapPinSvgOptions): string {
  const isCopper = options.isCopper;
  let fill = isCopper ? '#991b1b' : '#dc2626';
  if (options.isDarkPhase) {
    fill = isCopper ? '#dc2626' : '#ef4444';
  }
  let stroke = '#ffffff';
  let strokeWidth = options.selected ? 2.25 : 1.75;
  if (options.tvFocused) {
    stroke = '#fde047';
    strokeWidth = 2.75;
  }
  return `<circle cx="0" cy="0" r="5.5" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function stackBadgeMarkup(stackCount: number): string {
  const label = escapeXml(stackCount > 99 ? '99+' : String(stackCount));
  const fontSize = stackCount > 99 ? 5.5 : 6.5;
  return `
    <g transform="translate(8, -24)">
      <circle r="7.5" fill="rgba(15, 23, 42, 0.88)" stroke="rgba(255, 255, 255, 0.85)" stroke-width="0.75"/>
      <text y="0.35" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="700" dominant-baseline="middle">${label}</text>
    </g>
  `;
}

/** SVG document for rasterizing a map pin onto canvas (viewBox matches needle anchor at tip). */
export function buildMapPinSvgMarkup(options: MapPinSvgOptions): string {
  const useNeedle = options.pinStyle !== 'dot-classic';
  const colors = needleColorsForTrip(options.pinStyle, options.isCopper);
  const body = useNeedle
    ? needleBodyMarkup(colors, options.selected, options.tvFocused)
    : dotBodyMarkup(options);
  const badge = options.stackCount > 1 ? stackBadgeMarkup(options.stackCount) : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -34 28 38" width="112" height="152">
  <defs>
    <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(15,23,42,0.22)"/>
    </filter>
  </defs>
  <g filter="url(#pinShadow)">
    ${body}
    ${badge}
  </g>
</svg>`;
}

export function mapPinSvgCacheKey(options: MapPinSvgOptions): string {
  return [
    options.pinStyle,
    options.isCopper ? 'c' : 'n',
    options.selected ? 's' : '',
    options.tvFocused ? 't' : '',
    options.stackCount,
    options.isDarkPhase ? 'd' : 'l',
  ].join('|');
}
