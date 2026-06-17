import type { WorldSpec } from '../../engine/definition';

/**
 * World geometry: the canonical aquarium size in px — the fixed physical playfield the normalized 0..1 coords
 * map onto. Larger than a typical viewport: the client renders this fixed-size world behind a camera that
 * follows the player, so absolute sprite sizes (and thus target size/density) stay identical across screens.
 * The server stays in 0..1 and only reads it via `halfExtentNorm` for size-aware edge bounds. Tunable by playtest.
 * `itemSizePx` is the falling-item sprite box (render size AND collision reach); the bomb overrides it per-item.
 */
export const WORLD = {
  width: 2400,
  height: 900,
  itemSizePx: 60,
} as const satisfies WorldSpec;
