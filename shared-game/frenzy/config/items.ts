/** Falling-item physics and the fixed per-type hp payoff of eating one. */
export const ITEMS = {
  /** Hp delta when an item is eaten, by type: + food/candy, − rotten, 0 for rock. `bomb` is never eaten (it nudges on click, damages via blast on land) and `mushroom` rolls a random delta in `bomb`-style — the 0 only keeps this map total over `ItemType`. */
  itemEffects: {
    food: 10,
    rotten: -15,
    rock: 0,
    brick: 0,
    rareCandy: 30,
    bomb: 0,
    goldenBerry: 25,
    crumb: 5,
    mushroom: 0,
    vitamin: 0,
    shield: 0,
    easterEgg: 0,
  },
  /** Item fall speed by type, normalized scene-height units per second (1 = full height). 0.15 ≈ 6.7 s to cross; rock is heavier so it falls a bit faster, crumb is light-but-quick, goldenBerry drops a touch faster (catch it before it's gone). */
  fallSpeed: {
    food: 0.15,
    rotten: 0.15,
    rock: 0.2,
    brick: 0.22,
    rareCandy: 0.15,
    bomb: 0.035,
    goldenBerry: 0.18,
    crumb: 0.25,
    mushroom: 0.15,
    vitamin: 0.15,
    shield: 0.15,
    easterEgg: 0.18,
  },
  /** How long an item lies on the floor (still edible) after landing before it disappears, ms. */
  itemRestMs: 3000,
  /** `[min, max]` horizontal spawn position of an item (normalized 0..1), inset from the scene edges. */
  itemSpawnXRange: [0.05, 0.95],
} as const;
