/** Equirectangular projection matching world-map.svg viewBox */
export function projectCoordinates(lat: number, lng: number): { x: number; y: number } {
  return {
    x: 2.4088 * lng + 401.22,
    y: -3.2628 * lat + 527.43,
  };
}

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

/** Spherical interpolation between two lat/lng points */
function interpolateGreatCircle(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  t: number,
): { lat: number; lng: number } {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lng1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lng2);

  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  const dot = x1 * x2 + y1 * y2 + z1 * z2;
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
  if (omega < 1e-6) {
    return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
  }

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;

  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

/** Great-circle route as SVG path (stroke only — never fill) */
export function getGreatCirclePath(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  laneOffset = 0,
  steps = 48,
): string {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { lat, lng } = interpolateGreatCircle(fromLat, fromLng, toLat, toLng, t);
    points.push(projectCoordinates(lat, lng));
  }

  // Slight perpendicular lane offset for overlapping routes
  if (laneOffset !== 0 && points.length > 2) {
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const next = points[i + 1];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      points[i] = {
        x: points[i].x + (-dy / len) * laneOffset,
        y: points[i].y + (dx / len) * laneOffset,
      };
    }
  }

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}
