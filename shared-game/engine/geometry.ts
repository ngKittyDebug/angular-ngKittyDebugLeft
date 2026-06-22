/**
 * Pure geometry helpers shared by the engine and the client extrapolators. Game-agnostic: every tunable comes
 * in as a parameter — the game's `config.ts` re-exports themed wrappers with its own defaults, so client call
 * sites stay unchanged while the engine passes its `GameDefinition` values explicitly.
 */

/**
 * Normalized half-extent (0..1) of a `sizePx`-wide sprite measured along a world axis of `dimensionPx`.
 * Used for size-aware edge bounds: keeping an actor's centre at least this far from a world wall keeps the
 * whole sprite inside the playfield (no clipping through the edge).
 */
export function halfExtentNorm(sizePx: number, dimensionPx: number): number {
  return sizePx / 2 / dimensionPx;
}

/**
 * Deterministic per-item resting y (normalized) within `range`, hashed from the item id. Server-authoritative:
 * the engine settles a landing item here, and the client extrapolator clamps the fall to the SAME value (so no
 * snap on the confirming snapshot). Spreading rest y by id scatters settled items across the floor band instead
 * of stacking them on one row.
 */
export function restYFor(id: string, range: readonly [number, number]): number {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  const [min, max] = range;
  const fraction = (Math.abs(hash) % 1000) / 1000;

  return min + fraction * (max - min);
}
