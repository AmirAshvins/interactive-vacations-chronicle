import type { MapPinStyleId } from '../data/mapPinStyles';
import type { MapPinStack } from './mapPinDisplay';
import { projectCoordinates } from './mapProjection';
import { clientToViewBox } from './mapViewFit';
import type { Trip } from '../types/travelogue';

export interface PinHitTestContext {
  svg: SVGSVGElement;
  pinStacks: MapPinStack[];
  pinScale: number;
  mapPinStyle: MapPinStyleId;
  pinDrag: { tripId: string; lat: number; lng: number } | null;
}

const PIN_TIP_RADIUS = 11;
const PIN_BODY_RX = 10;
const PIN_BODY_RY = 15;
const PIN_BODY_CY = -12;
const PIN_BADGE_RADIUS = 11;

/** Hit test in pin-local coordinates (anchor at needle tip 0,0). */
export function isPointInPinLocal(
  localX: number,
  localY: number,
  mapPinStyle: MapPinStyleId,
  stackCount: number,
): boolean {
  if (mapPinStyle === 'dot-classic') {
    return localX * localX + localY * localY <= 9 * 9;
  }

  if (localX * localX + localY * localY <= PIN_TIP_RADIUS * PIN_TIP_RADIUS) {
    return true;
  }

  const bodyDx = localX / PIN_BODY_RX;
  const bodyDy = (localY - PIN_BODY_CY) / PIN_BODY_RY;
  if (bodyDx * bodyDx + bodyDy * bodyDy <= 1) {
    return true;
  }

  if (stackCount > 1) {
    const badgeDx = localX - 8;
    const badgeDy = localY + 24;
    if (badgeDx * badgeDx + badgeDy * badgeDy <= PIN_BADGE_RADIUS * PIN_BADGE_RADIUS) {
      return true;
    }
  }

  return false;
}

export function hitTestPinStacksFromViewBox(
  viewBoxX: number,
  viewBoxY: number,
  ctx: Omit<PinHitTestContext, 'svg'>,
): MapPinStack[] {
  const hits: { stack: MapPinStack; dist: number }[] = [];

  for (const stack of ctx.pinStacks) {
    const trip = stack.displayTrip;
    const isDraggingPin = ctx.pinDrag?.tripId === trip.id;
    const lat = isDraggingPin ? ctx.pinDrag!.lat : stack.lat;
    const lng = isDraggingPin ? ctx.pinDrag!.lng : stack.lng;
    const { x, y } = projectCoordinates(lat, lng);
    const localX = (viewBoxX - x) / ctx.pinScale;
    const localY = (viewBoxY - y) / ctx.pinScale;

    if (isPointInPinLocal(localX, localY, ctx.mapPinStyle, stack.count)) {
      hits.push({ stack, dist: Math.hypot(viewBoxX - x, viewBoxY - y) });
    }
  }

  return hits.sort((a, b) => a.dist - b.dist).map((hit) => hit.stack);
}

export function hitTestPinStacksFromClient(
  clientX: number,
  clientY: number,
  ctx: PinHitTestContext,
): MapPinStack[] {
  const pt = clientToViewBox(ctx.svg, clientX, clientY);
  if (!pt) return [];
  return hitTestPinStacksFromViewBox(pt.x, pt.y, ctx);
}

export function collectPickerTrips(stacks: MapPinStack[]): Trip[] {
  const seen = new Set<string>();
  const trips: Trip[] = [];
  for (const stack of stacks) {
    for (const trip of stack.trips) {
      if (!seen.has(trip.id)) {
        seen.add(trip.id);
        trips.push(trip);
      }
    }
  }
  return trips;
}

export interface PinPickerResolution {
  stacks: MapPinStack[];
  trips: Trip[];
  anchorLabel: string;
}

export function resolvePinPickerFromClient(
  clientX: number,
  clientY: number,
  ctx: PinHitTestContext,
): PinPickerResolution | null {
  const stacks = hitTestPinStacksFromClient(clientX, clientY, ctx);
  if (!stacks.length) return null;

  const trips = collectPickerTrips(stacks);
  return {
    stacks,
    trips,
    anchorLabel: stacks[0].displayTrip.name,
  };
}
