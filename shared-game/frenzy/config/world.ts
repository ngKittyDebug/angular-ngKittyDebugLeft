/** World geometry: the fixed physical playfield the normalized 0..1 coords map onto, plus sprite-box sizes. */
export const WORLD = {
  /** Canonical world (aquarium) size in px — the fixed physical playfield the normalized 0..1 coords map onto.
   * Larger than a typical viewport: the client renders this fixed-size world and a camera scrolls it to follow
   * the player's Pokémon, so absolute sprite sizes (and thus target size/density) stay identical across screens.
   * The server stays in 0..1 and only reads it via `halfExtentNorm` for size-aware edge bounds. Tunable by playtest. */
  world: { width: 1600, height: 1000 },
  /** Physical sprite-box sizes in world px — single source for both render size (client) and the size-aware edge
   * bounds (server, via `halfExtentNorm`). `item` is the falling-item sprite box; `player` is the Pokémon sprite
   * height by stage. */
  physicalSizePx: {
    item: 60,
    player: { 1: 72, 2: 96, 3: 120 },
  },
} as const;
