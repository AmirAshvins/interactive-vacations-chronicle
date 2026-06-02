export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 4;

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
