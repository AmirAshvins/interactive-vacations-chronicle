export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

const DIRECTION_VECTORS: Record<SpatialDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Pick the candidate most aligned with `direction` from `current` (spatial D-pad). */
export function findNearestInDirection(
  current: ScreenPoint,
  candidates: ScreenPoint[],
  direction: SpatialDirection,
): string | null {
  const { dx: dirX, dy: dirY } = DIRECTION_VECTORS[direction];
  let bestId: string | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    if (candidate.id === current.id) continue;

    const ox = candidate.x - current.x;
    const oy = candidate.y - current.y;
    const alignment = ox * dirX + oy * dirY;

    if (alignment <= 4) continue;

    const distSq = ox * ox + oy * oy;
    const score = alignment - distSq * 0.002;

    if (score > bestScore) {
      bestScore = score;
      bestId = candidate.id;
    }
  }

  return bestId;
}

export function pickInitialPinId(
  trips: { id: string }[],
  positions: Record<string, { x: number; y: number }>,
): string | null {
  if (!trips.length) return null;
  const withPos = trips
    .map((t) => ({ id: t.id, pos: positions[t.id] }))
    .filter((t): t is { id: string; pos: { x: number; y: number } } => Boolean(t.pos));

  if (!withPos.length) return trips[0].id;

  const centroid = withPos.reduce(
    (acc, t) => ({ x: acc.x + t.pos.x, y: acc.y + t.pos.y }),
    { x: 0, y: 0 },
  );
  centroid.x /= withPos.length;
  centroid.y /= withPos.length;

  let bestId = withPos[0].id;
  let bestDist = Infinity;
  for (const t of withPos) {
    const d = (t.pos.x - centroid.x) ** 2 + (t.pos.y - centroid.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestId = t.id;
    }
  }
  return bestId;
}
