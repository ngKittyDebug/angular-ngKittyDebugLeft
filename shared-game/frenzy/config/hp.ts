/** HP economy: the resource every Pokémon spends (decay) and earns (eating), and the evolution ladder it climbs. */
export const HP = {
  /** Starting HP of a fresh Pokémon (stage 1). Baseline for evolution thresholds and decay. */
  startingHp: 100,
  /** Hard ceiling on a Pokémon's HP — the server clamps every gain to this, and absolute indicators scale to it. */
  maxHp: 1500,
  /** HP removed per decay step (not per game tick — a step happens once every `decayIntervalMs`). */
  decayPerTick: 2,
  /** Decay period, ms. Every interval the HP of all alive Pokémon drops by `decayPerTick`. */
  decayIntervalMs: 3000,
  /** HP thresholds for evolution: `stage2` — transition 1→2, `stage3` — 2→3. */
  thresholds: { stage2: 200, stage3: 500 },
  /** HP below which the client shows a low-HP warning. */
  lowHpWarningThreshold: 6,
} as const;
