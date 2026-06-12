/** World geometry: the fixed physical playfield the normalized 0..1 coords map onto, plus sprite-box sizes. */
export const WORLD = {
  /** Canonical world (aquarium) size in px — the fixed physical playfield the normalized 0..1 coords map onto.
   * Larger than a typical viewport: the client renders this fixed-size world and a camera scrolls it to follow
   * the player's Pokémon, so absolute sprite sizes (and thus target size/density) stay identical across screens.
   * The server stays in 0..1 and only reads it via `halfExtentNorm` for size-aware edge bounds. Tunable by playtest. */
  world: { width: 2400, height: 900 },
  /** Physical sprite-box size in world px of a falling item — single source for both render size (client) and the
   * size-aware collision reach (server). Per-player sprite sizes are no longer global: they're per-stage, per-line
   * and arrive on `join` as `Player.body` (see `StageBody`), so the server stays roster-agnostic. */
  physicalSizePx: {
    item: 60,
  },
} as const;
