/** Mass economy: the resource every Pokémon spends (decay) and earns (eating), and the evolution ladder it climbs. */
export const MASS = {
  /** Starting mass of a fresh Pokémon (stage 1). Baseline for evolution thresholds and decay. */
  startingMass: 100,
  /** Mass removed per decay step (not per game tick — a step happens once every `decayIntervalMs`). */
  decayPerTick: 2,
  /** Decay period, ms. Every interval the mass of all alive Pokémon drops by `decayPerTick`. */
  decayIntervalMs: 3000,
  /** Mass thresholds for evolution: `stage2` — transition 1→2, `stage3` — 2→3. */
  thresholds: { stage2: 200, stage3: 500 },
  /** Mass below which the client shows a low-mass warning. */
  lowMassWarningThreshold: 6,
} as const;
