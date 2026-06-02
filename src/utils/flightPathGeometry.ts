export interface QuadraticBezierPath {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
}

export function parseQuadraticBezierPath(pathD: string): QuadraticBezierPath | null {
  const curve = pathD.match(
    /^M\s+([-\d.]+)\s+([-\d.]+)\s+Q\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)$/,
  );
  if (curve) {
    return {
      x0: Number(curve[1]),
      y0: Number(curve[2]),
      cx: Number(curve[3]),
      cy: Number(curve[4]),
      x1: Number(curve[5]),
      y1: Number(curve[6]),
    };
  }

  const line = pathD.match(/^M\s+([-\d.]+)\s+([-\d.]+)\s+L\s+([-\d.]+)\s+([-\d.]+)$/);
  if (line) {
    const x0 = Number(line[1]);
    const y0 = Number(line[2]);
    const x1 = Number(line[3]);
    const y1 = Number(line[4]);
    return { x0, y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, x1, y1 };
  }

  return null;
}

export function pointOnQuadraticBezier(
  b: QuadraticBezierPath,
  t: number,
): { x: number; y: number; angle: number } {
  const u = 1 - t;
  const x = u * u * b.x0 + 2 * u * t * b.cx + t * t * b.x1;
  const y = u * u * b.y0 + 2 * u * t * b.cy + t * t * b.y1;
  const dx = 2 * u * (b.cx - b.x0) + 2 * t * (b.x1 - b.cx);
  const dy = 2 * u * (b.cy - b.y0) + 2 * t * (b.y1 - b.cy);
  return { x, y, angle: Math.atan2(dy, dx) };
}
