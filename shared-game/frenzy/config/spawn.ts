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
    easterEgg: 6,
  },
  /** `[min, max]` ms between item spawns at `spawnReferencePlayers`; the actual interval is picked randomly within the range, then scaled by active-player count. */
  spawnIntervalMsRange: [700, 1300],
  /** Active-player count at which the spawn interval matches `spawnIntervalMsRange` as-is. The interval scales by `spawnReferencePlayers / activePlayers`, so per capita food income stays ~constant. */
  spawnReferencePlayers: 3,
} as const;
