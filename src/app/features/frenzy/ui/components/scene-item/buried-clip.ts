// Wavy buried sand-line for a rested item — shared by the DOM `clip-path` and the canvas renderer so both draw the
// identical per-item shape (no drift between render modes). The edge is sampled across the sprite width and each
// sample is jittered around a base depth, seeded from the item id so the shape is stable per item and never re-rolls
// between frames. Pure + unit-tested; extracted from SceneItemComponent so the canvas renderer reuses it verbatim.

// % from the top where the sand line sits (matches the old straight 30%-from-bottom inset).
const BURIED_CUT = 70;
// % the line wanders above/below the cut at each sample.
const BURIED_SWING = 7;
// Samples across the width — few enough to read as irregular lumps, not a smooth sine.
const BURIED_SEGMENTS = 5;

// A clip vertex in percent (0..100) of the sprite box: the DOM joins these into a `polygon()` string, the canvas
// renderer scales them to px for a `Path2D`.
export interface BuriedClipPoint {
  x: number;
  y: number;
}

// Stable 0..1 value from a seed + sample index (a cheap integer hash, no Math.random so it never flickers).
function buriedNoise(seed: number, index: number): number {
  let hash = Math.imul(seed ^ (index + 0x9e37_79b9), 2_654_435_761);

  hash ^= hash >>> 15;

  return (hash >>> 0) / 0xffff_ffff;
}

// FNV-1a hash of the item id → the per-item wave seed.
export function hashItemId(id: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

// The buried-clip polygon as percent points: the two top corners, then the wavy sand line sampled right→left.
export function buriedClipPoints(id: string): BuriedClipPoint[] {
  const seed = hashItemId(id);
  const points: BuriedClipPoint[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  for (let index = 0; index <= BURIED_SEGMENTS; index++) {
    const x = 100 - (100 / BURIED_SEGMENTS) * index;
    const depth = BURIED_CUT + (buriedNoise(seed, index) - 0.5) * 2 * BURIED_SWING;

    points.push({ x, y: depth });
  }

  return points;
}

// The CSS `clip-path: polygon(...)` value built from the shared points — the DOM renderer's consumer.
export function buriedClipPolygon(id: string): string {
  const polygon = buriedClipPoints(id)
    .map((point) => `${point.x.toFixed(1)}% ${point.y.toFixed(1)}%`)
    .join(', ');

  return `polygon(${polygon})`;
}
