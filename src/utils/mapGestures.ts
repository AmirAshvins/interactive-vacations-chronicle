export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 4;
export const MAP_ZOOM_STEP = 1.22;
export const MAP_PAN_STEP_RATIO = 0.14;

export interface MapPan {
  x: number;
  y: number;
}

export function clampMapPan(
  pan: MapPan,
  zoom: number,
  containerWidth: number,
  containerHeight: number,
): MapPan {
  if (zoom <= MAP_MIN_ZOOM) return { x: 0, y: 0 };
  const maxX = (containerWidth * (zoom - 1)) / 2;
  const maxY = (containerHeight * (zoom - 1)) / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, pan.x)),
    y: Math.max(-maxY, Math.min(maxY, pan.y)),
  };
}

/** Keep focal point stable while zooming (focal coords relative to container center). */
export function zoomMapAtPoint(
  currentZoom: number,
  currentPan: MapPan,
  nextZoom: number,
  focalX: number,
  focalY: number,
  containerWidth: number,
  containerHeight: number,
): { zoom: number; pan: MapPan } {
  const zoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, nextZoom));
  if (zoom <= MAP_MIN_ZOOM) {
    return { zoom: MAP_MIN_ZOOM, pan: { x: 0, y: 0 } };
  }

  const ratio = zoom / currentZoom;
  const pan = clampMapPan(
    {
      x: focalX - ratio * (focalX - currentPan.x),
      y: focalY - ratio * (focalY - currentPan.y),
    },
    zoom,
    containerWidth,
    containerHeight,
  );

  return { zoom, pan };
}

export function focalFromClient(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
}

export type MapPanDirection = 'up' | 'down' | 'left' | 'right';

/** Nudge the map view by a fixed fraction of the viewport (TV / on-screen controls). */
export function stepMapPan(
  pan: MapPan,
  zoom: number,
  direction: MapPanDirection,
  containerWidth: number,
  containerHeight: number,
): MapPan {
  if (zoom <= MAP_MIN_ZOOM) return { x: 0, y: 0 };

  const stepX = containerWidth * MAP_PAN_STEP_RATIO;
  const stepY = containerHeight * MAP_PAN_STEP_RATIO;
  const next = { ...pan };

  if (direction === 'left') next.x += stepX;
  if (direction === 'right') next.x -= stepX;
  if (direction === 'up') next.y += stepY;
  if (direction === 'down') next.y -= stepY;

  return clampMapPan(next, zoom, containerWidth, containerHeight);
}

/** Pin diameter shrinks as zoom increases so nearby cities stay separable. */
export function getPinScreenScale(zoom: number): number {
  return Math.max(0.32, Math.min(1, 1 / zoom));
}
