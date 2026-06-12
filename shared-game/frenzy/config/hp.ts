/** HP economy: the resource every Pokémon spends (decay) and earns (eating), and the evolution ladder it climbs. */
export const HP = {
  /** Starting HP of a fresh Pokémon. Baseline for decay; the starting stage is derived from the player's own
   * per-stage `hp` gates (`Player.body`), so the server no longer hardcodes evolution thresholds. */
  startingHp: 100,
  /** Hard ceiling on a Pokémon's HP — the server clamps every gain to this, and absolute indicators scale to it. */
  maxHp: 1500,
  /** HP removed per decay step (not per game tick — a step happens once every `decayIntervalMs`). */
  decayPerTick: 2,
  /** Decay period, ms. Every interval the HP of all alive Pokémon drops by `decayPerTick`. */
  decayIntervalMs: 3000,
  /** HP below which the client shows a low-HP warning. */
  lowHpWarningThreshold: 6,
} as const;
