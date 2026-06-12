/** Item spawn cadence and the relative odds of each item type appearing. */
export const SPAWN = {
  /** Relative spawn weights per item type (not percentages — normalized by the sum of weights). */
  spawnWeights: {
    food: 55,
    rotten: 15,
    rock: 20,
    brick: 10,
    rareCandy: 5,
    bomb: 10,
    goldenBerry: 5,
    crumb: 35,
    mushroom: 12,
    vitamin: 8,
    shield: 6,
    easterEgg: 12,
    poop: 6,
  },
  /** Relative weights for what the `laying` (easter-egg) aura sprays — its own pool, not `spawnWeights`, so the
   * egg-laying mode is a pure treat: only positive/benign items, never the nasty drops (rotten/rock/brick/bomb) nor
   * the aura items (easterEgg/poop, which would self-replicate the emit auras). Mirror the natural good-item odds.
   * Normalized by their sum like `spawnWeights`. */
  eggEmitWeights: {
    food: 55,
    crumb: 35,
    mushroom: 12,
    vitamin: 8,
    shield: 6,
    rareCandy: 5,
    goldenBerry: 5,
  },
  /** Relative weights for what the `pooping` aura sprays — a separate pool from `spawnWeights` (which also drives
   * normal drops), so tuning the poop spray never shifts the world drop mix. Restricted to the nasty trio; brick
   * outweighs rock here. Normalized by their sum like `spawnWeights`. */
  poopEmitWeights: {
    rock: 10,
    brick: 20,
    bomb: 7,
  },
  /** `[min, max]` ms between item spawns at `spawnReferencePlayers`; the actual interval is picked randomly within the range, then scaled by active-player count. Shortened ~×1.5 alongside the world widening (1600→2400) so the wider arena keeps the same item density per unit width rather than reading sparse. */
  spawnIntervalMsRange: [480, 880],
  /** Active-player count at which the spawn interval matches `spawnIntervalMsRange` as-is. The interval scales by `spawnReferencePlayers / activePlayers`, so per capita food income stays ~constant. */
  spawnReferencePlayers: 3,
} as const;
