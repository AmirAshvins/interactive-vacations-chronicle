import type { MapPinStyleId } from '../data/mapPinStyles';
import { needleColorsForTrip, type NeedlePinColors } from '../data/mapPinStyles';
import type { Trip } from '../types/travelogue';

export interface PinCanvasEntry {
  x: number;
  y: number;
  trip: Trip;
  selected: boolean;
  tvFocused: boolean;
  stackCount: number;
  isDragging: boolean;
}

function drawNeedlePinBody(
  ctx: CanvasRenderingContext2D,
  colors: NeedlePinColors,
  selected: boolean,
  tvFocused: boolean,
  withShadow: boolean,
) {
  if (withShadow) {
    ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0.55, -14.5);
  ctx.lineTo(0, -15.2);
  ctx.lineTo(-0.55, -14.5);
  ctx.closePath();
  ctx.fillStyle = colors.needle;
  ctx.strokeStyle = 'rgba(15,23,42,0.25)';
  ctx.lineWidth = 0.35;
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.ellipse(0, -15.8, 4.8, 1.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.flange;
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-0.55, -18.2, 1.1, 2.6, 0.35);
  } else {
    ctx.rect(-0.55, -18.2, 1.1, 2.6);
  }
  ctx.fillStyle = colors.flange;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -20.4, 5.6, 4.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.head;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-1.4, -21.8, 2.2, 1.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.headHighlight;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (selected || tvFocused) {
    ctx.beginPath();
    ctx.ellipse(0, -20.4, 7.2, 6.4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = tvFocused ? '#fde047' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function drawDotPinBody(
  ctx: CanvasRenderingContext2D,
  trip: Trip,
  selected: boolean,
  tvFocused: boolean,
  isDarkPhase: boolean,
  isDragging: boolean,
) {
  const isCopper = trip.material === 'copper';
  let fill = isCopper ? '#991b1b' : '#dc2626';
  if (isDarkPhase) {
    fill = isCopper ? '#dc2626' : '#ef4444';
  }

  let stroke = '#fff';
  let lineWidth = selected ? 2.25 : 1.75;
  if (isDragging) {
    stroke = '#fecaca';
    lineWidth = 2.5;
  }
  if (tvFocused) {
    stroke = '#fde047';
    lineWidth = 2.75;
  }

  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawStackBadge(ctx: CanvasRenderingContext2D, stackCount: number) {
  const bx = 8;
  const by = -24;
  const label = stackCount > 99 ? '99+' : String(stackCount);
  const fontSize = stackCount > 99 ? 5.5 : 6.5;

  ctx.beginPath();
  ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx, by + 0.35);
}

export function drawMapPin(
  ctx: CanvasRenderingContext2D,
  entry: PinCanvasEntry,
  pinStyle: MapPinStyleId,
  pinScale: number,
  isDarkPhase: boolean,
  withShadow: boolean,
) {
  ctx.save();
  ctx.translate(entry.x, entry.y);
  ctx.scale(pinScale, pinScale);

  const useNeedle = pinStyle !== 'dot-classic';
  const colors = needleColorsForTrip(pinStyle, entry.trip.material === 'copper');

  if (useNeedle) {
    drawNeedlePinBody(ctx, colors, entry.selected, entry.tvFocused, withShadow);
  } else {
    drawDotPinBody(
      ctx,
      entry.trip,
      entry.selected,
      entry.tvFocused,
      isDarkPhase,
      entry.isDragging,
    );
  }

  if (entry.stackCount > 1) {
    drawStackBadge(ctx, entry.stackCount);
  }

  ctx.restore();
}

export function drawMapPins(
  ctx: CanvasRenderingContext2D,
  entries: PinCanvasEntry[],
  pinStyle: MapPinStyleId,
  pinScale: number,
  isDarkPhase: boolean,
  withShadow: boolean,
) {
  for (const entry of entries) {
    drawMapPin(ctx, entry, pinStyle, pinScale, isDarkPhase, withShadow);
  }
}
