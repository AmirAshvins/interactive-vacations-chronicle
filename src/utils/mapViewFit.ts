import { MAP_VIEWBOX } from './mapViewBox';

export interface ViewBoxFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function getViewBoxFit(width: number, height: number): ViewBoxFit {
  const scale = Math.min(width / MAP_VIEWBOX.width, height / MAP_VIEWBOX.height);
  return {
    scale,
    offsetX: (width - MAP_VIEWBOX.width * scale) / 2,
    offsetY: (height - MAP_VIEWBOX.height * scale) / 2,
  };
}

export function clientToViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}
