// Pure geometry for the off-screen indicators: project a world point to `.scene` screen px, decide if it's
// off-screen, find where the line from the viewport centre to it crosses the inset edge (the arrow's slide point),
// the bearing to rotate the glyph, and the 1D edge-clustering. Free of Angular and the DOM so it unit-tests
// directly (a sibling of `camera-math.ts`); the component owns the per-frame DOM writes.

import type { CameraSnapshot } from '../scene/camera/scene-camera.service';

export type Side = 'top' | 'bottom' | 'left' | 'right';

export interface ScreenPoint {
  sx: number;
  sy: number;
}

export interface EdgeHit {
  /** Edge-point screen px (already clamped inside the inset rect). */
  x: number;
  y: number;
  side: Side;
  /** Position ALONG the side (px): the x for top/bottom, the y for left/right — the 1D clustering coordinate. */
  t: number;
}

// Project a normalized world point (0..1) to `.scene` screen px: the world layer is `translate(cam) scale` with
// origin 0 0, so a child at world px `f·worldPx` lands at `f·worldPx·scale + cam`.
export function projectToScreen(
  nx: number,
  ny: number,
  worldWidth: number,
  worldHeight: number,
  cam: CameraSnapshot,
): ScreenPoint {
  return {
    sx: nx * worldWidth * cam.scale + cam.camX,
    sy: ny * worldHeight * cam.scale + cam.camY,
  };
}

// Outside the live viewport rect [0,vw]×[0,vh]? Tested against the actual rect (not a symmetric assumption): the
// world renders taller than the viewport (CAMERA_VERTICAL_FILL), so the vertical margins are genuinely asymmetric.
export function isOffscreen(
  point: ScreenPoint,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  return point.sx < 0 || point.sx > viewportWidth || point.sy < 0 || point.sy > viewportHeight;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

// Where the ray from the viewport centre toward an off-screen point crosses the inset rectangle (margin px inside
// each edge). The centre is inside and the point is outside, so the ray exits through exactly one edge; the
// smaller of the two axis crossing params picks it (ties → vertical, deterministic for corners).
export function edgeHit(
  point: ScreenPoint,
  viewportWidth: number,
  viewportHeight: number,
  margin: number,
): EdgeHit {
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;
  const deltaX = point.sx - centerX;
  const deltaY = point.sy - centerY;
  const left = margin;
  const right = viewportWidth - margin;
  const top = margin;
  const bottom = viewportHeight - margin;

  const tx =
    deltaX > 0 ? (right - centerX) / deltaX : deltaX < 0 ? (left - centerX) / deltaX : Infinity;
  const ty =
    deltaY > 0 ? (bottom - centerY) / deltaY : deltaY < 0 ? (top - centerY) / deltaY : Infinity;
  const t = Math.min(tx, ty);
  const hitX = centerX + t * deltaX;
  const hitY = centerY + t * deltaY;

  if (tx <= ty) {
    const y = clamp(hitY, top, bottom);

    return { x: deltaX > 0 ? right : left, y, side: deltaX > 0 ? 'right' : 'left', t: y };
  }

  const x = clamp(hitX, left, right);

  return { x, y: deltaY > 0 ? bottom : top, side: deltaY > 0 ? 'bottom' : 'top', t: x };
}

export interface EdgeArrowInput {
  id: string;
  name: string;
  side: Side;
  /** Position along the side (px) — `EdgeHit.t`. */
  t: number;
}

export interface EdgeArrowGroup {
  /** Stable @for key: the sorted member ids, so the same group keeps its DOM node across frames. */
  key: string;
  side: Side;
  memberIds: readonly string[];
  /** The name when the group is a single player; null for a multi-member count-badge. */
  name: string | null;
  count: number;
}

function toGroup(members: readonly EdgeArrowInput[]): EdgeArrowGroup {
  const ids = members.map((member) => member.id).sort();

  return {
    key: ids.join('|'),
    side: members[0].side,
    memberIds: ids,
    name: members.length === 1 ? members[0].name : null,
    count: members.length,
  };
}

// Greedy 1D chain-merge per edge: the viewport border is one-dimensional along each side, so sort the side's
// points by `t` and absorb the next while it's within `clusterDistance` of the LAST absorbed point (chaining, so a
// dense run collapses fully). Then enforce `maxNamed`: while too many singles remain, merge the closest adjacent
// pair on the most-crowded edge — densest pileups fold to count-badges first, lone outliers keep their names.
export function clusterEdgeArrows(
  inputs: readonly EdgeArrowInput[],
  clusterDistance: number,
  maxNamed: number,
): EdgeArrowGroup[] {
  const bySide = new Map<Side, EdgeArrowInput[]>();

  for (const input of inputs) {
    const bucket = bySide.get(input.side);

    if (bucket === undefined) {
      bySide.set(input.side, [input]);
    } else {
      bucket.push(input);
    }
  }

  let clusters: EdgeArrowInput[][] = [];

  for (const bucket of bySide.values()) {
    bucket.sort((first, second) => first.t - second.t);

    let current: EdgeArrowInput[] = [];
    let lastT = -Infinity;

    for (const point of bucket) {
      if (current.length > 0 && point.t - lastT <= clusterDistance) {
        current.push(point);
      } else {
        if (current.length > 0) {
          clusters.push(current);
        }

        current = [point];
      }

      lastT = point.t;
    }

    if (current.length > 0) {
      clusters.push(current);
    }
  }

  clusters = capNamedArrows(clusters, maxNamed);

  return clusters.map(toGroup);
}

// Best-effort cap: collapse the closest adjacent singles on whichever edge has the most singles, one merge per
// pass, until the named count is within budget. Stops if no edge has ≥2 singles to merge (e.g. one stray per side).
function capNamedArrows(clusters: EdgeArrowInput[][], maxNamed: number): EdgeArrowInput[][] {
  const working = [...clusters];

  for (;;) {
    const singles = working.filter((cluster) => cluster.length === 1);

    if (singles.length <= maxNamed) {
      return working;
    }

    const crowdedSide = mostCrowdedSide(singles);

    if (crowdedSide === null) {
      return working;
    }

    const sideSingles = singles
      .filter((cluster) => cluster[0].side === crowdedSide)
      .sort((first, second) => first[0].t - second[0].t);
    const pairStart = closestAdjacentIndex(sideSingles);
    const first = sideSingles[pairStart];
    const second = sideSingles[pairStart + 1];

    working.splice(working.indexOf(first), 1);
    working.splice(working.indexOf(second), 1);
    working.push([first[0], second[0]]);
  }
}

function mostCrowdedSide(singles: readonly EdgeArrowInput[][]): Side | null {
  const counts = new Map<Side, number>();

  for (const single of singles) {
    counts.set(single[0].side, (counts.get(single[0].side) ?? 0) + 1);
  }

  let best: Side | null = null;
  let bestCount = 1;

  for (const [side, count] of counts) {
    if (count >= 2 && count > bestCount) {
      best = side;
      bestCount = count;
    }
  }

  return best;
}

function closestAdjacentIndex(sortedSingles: readonly EdgeArrowInput[][]): number {
  let bestIndex = 0;
  let bestGap = Infinity;

  for (let i = 0; i < sortedSingles.length - 1; i++) {
    const gap = sortedSingles[i + 1][0].t - sortedSingles[i][0].t;

    if (gap < bestGap) {
      bestGap = gap;
      bestIndex = i;
    }
  }

  return bestIndex;
}
