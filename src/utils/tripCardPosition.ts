import { projectCoordinates, type ProjectOptions } from './flightArc';

export const TRIP_CARD_HEIGHT = 420;
export const TRIP_CARD_MARGIN = 12;
export const PIN_CARD_GAP = 14;

export function tripCardDimensions() {
  return {
    w: Math.min(320, window.innerWidth * 0.26),
    h: TRIP_CARD_HEIGHT,
  };
}

export function latLngToScreen(
  lat: number,
  lng: number,
  pinLayer: SVGSVGElement,
  projectOptions?: ProjectOptions,
): { x: number; y: number } | null {
  const { x, y } = projectCoordinates(lat, lng, projectOptions);
  const pt = pinLayer.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const ctm = pinLayer.getScreenCTM();
  if (!ctm) return null;
  const screen = pt.matrixTransform(ctm);
  return { x: screen.x, y: screen.y };
}

/** Place card above the pin by default, clamped inside the viewport. */
export function pinAnchoredCardPosition(
  pinX: number,
  pinY: number,
  offsetX = 0,
  offsetY = 0,
) {
  const { w: cardW, h: cardH } = tripCardDimensions();
  const margin = TRIP_CARD_MARGIN;
  const gap = PIN_CARD_GAP;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = pinX - cardW / 2 + offsetX;
  let y = pinY - cardH - gap + offsetY;

  const roomAbove = y >= margin;
  const roomBelow = pinY + gap + cardH <= vh - margin;
  if (!roomAbove && roomBelow) {
    y = pinY + gap + offsetY;
  }

  x = Math.max(margin, Math.min(vw - cardW - margin, x));
  y = Math.max(margin, Math.min(vh - cardH - margin, y));

  return { x, y };
}
