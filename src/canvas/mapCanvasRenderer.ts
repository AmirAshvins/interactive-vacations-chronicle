import {
  getFlightDashStyleForZoom,
  getFlightPlaneScale,
  getFlightStrokeScale,
} from '../utils/flightArc';
import { pointOnQuadraticBezier, type QuadraticBezierPath } from '../utils/flightPathGeometry';
import { getViewBoxFit } from '../utils/mapViewFit';
import { drawMapPins, type PinCanvasEntry } from './mapPinCanvas';
import type { MapPinStyleId } from '../data/mapPinStyles';

export interface FlightCanvasEntry {
  id: string;
  path2d: Path2D;
  bezier: QuadraticBezierPath;
  duration: number;
  idx: number;
  animationDelay: number;
}

export interface MapCanvasTheme {
  flightStroke: string;
  flightPlaneFill: string;
  flightPlaneStroke: string;
}

export interface MapCanvasDrawState {
  width: number;
  height: number;
  dpr: number;
  zoom: number;
  showFlights: boolean;
  denseFlightLayer: boolean;
  flights: FlightCanvasEntry[];
  pins: PinCanvasEntry[];
  pinScale: number;
  mapPinStyle: MapPinStyleId;
  isDarkPhase: boolean;
  pinShadows: boolean;
  theme: MapCanvasTheme;
}

function applyViewBoxTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { scale, offsetX, offsetY } = getViewBoxFit(width, height);
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
}

function drawFlightArcs(ctx: CanvasRenderingContext2D, state: MapCanvasDrawState) {
  if (!state.showFlights) return;

  const strokeMul = state.denseFlightLayer ? 0.82 : 1;
  const strokeScale = getFlightStrokeScale(state.zoom);
  const lineWidth = 0.9 * strokeScale * strokeMul;

  ctx.save();
  ctx.strokeStyle = state.theme.flightStroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  for (const flight of state.flights) {
    const dash = getFlightDashStyleForZoom(flight.id, state.denseFlightLayer, state.zoom);
    ctx.globalAlpha = dash.opacity;
    ctx.setLineDash(dash.strokeDasharray.split(' ').map(Number));
    ctx.lineDashOffset = dash.strokeDashoffset;
    ctx.stroke(flight.path2d);
  }

  ctx.restore();
}

function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  theme: MapCanvasTheme,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = theme.flightPlaneFill;
  ctx.strokeStyle = theme.flightPlaneStroke;
  ctx.lineWidth = 0.25;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8, -0.55);
  ctx.lineTo(9.5, 0);
  ctx.lineTo(8, 0.55);
  ctx.closePath();
  ctx.moveTo(1.8, -2.2);
  ctx.lineTo(5, -0.55);
  ctx.lineTo(1.8, -0.55);
  ctx.closePath();
  ctx.moveTo(1.8, 0.55);
  ctx.lineTo(5, 0.55);
  ctx.lineTo(1.8, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFlightPlanes(ctx: CanvasRenderingContext2D, state: MapCanvasDrawState, now: number) {
  if (!state.showFlights) return;

  const planeScale = getFlightPlaneScale(state.zoom) * 1.05;

  for (const flight of state.flights) {
    const elapsed = (now / 1000 - flight.animationDelay) % flight.duration;
    const t = elapsed < 0 ? (elapsed + flight.duration) / flight.duration : elapsed / flight.duration;
    const { x, y, angle } = pointOnQuadraticBezier(flight.bezier, t);
    drawPlane(ctx, x, y, angle, planeScale, state.theme);
  }
}

export function renderMapCanvas(
  canvas: HTMLCanvasElement,
  state: MapCanvasDrawState,
  now: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || state.width <= 0 || state.height <= 0) return;

  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.width, state.height);

  ctx.save();
  applyViewBoxTransform(ctx, state.width, state.height);
  drawFlightArcs(ctx, state);
  drawFlightPlanes(ctx, state, now);
  drawMapPins(
    ctx,
    state.pins,
    state.mapPinStyle,
    state.pinScale,
    state.isDarkPhase,
    state.pinShadows,
  );
  ctx.restore();
}
