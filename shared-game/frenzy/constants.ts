/**
 * Single source of game tunables for Feeding Frenzy.
 * Contract shared by the server (authoritative) and the client (render/UI) — imported by both via `@game/frenzy/constants`.
 * Coordinates are normalized (0..1): the client multiplies them by the viewport size.
 */
export const GAME = {
  /** Starting mass of a fresh Pokémon (stage 1). Baseline for evolution thresholds and decay. */
  startingMass: 100,
  /** Mass removed per decay step (not per game tick — a step happens once every `decayIntervalMs`). */
  decayPerTick: 2,
  /** Decay period, ms. Every interval the mass of all alive Pokémon drops by `decayPerTick`. */
  decayIntervalMs: 3000,
  /** Server game-loop frequency, ticks/sec. Moves items and schedules decay/snapshots. */
  tickRateHz: 10,
  /** Every Nth tick the server broadcasts a full snapshot to heal drift; between snapshots clients rely on delta events. At 10 Hz, 10 ≈ one snapshot/sec. */
  snapshotEveryNTicks: 10,
  /** Mass thresholds for evolution: `stage2` — transition 1→2, `stage3` — 2→3. */
  thresholds: { stage2: 200, stage3: 500 },
  /** Mass delta when an item is eaten, by type: + food/candy, − rotten, 0 for rock. `bomb` is never eaten (it nudges on click, damages via blast on land) and `mushroom` rolls a random delta in `bomb`-style — the 0 only keeps this map total over `ItemType`. */
  itemEffects: {
    food: 10,
    rotten: -15,
    rock: 0,
    rareCandy: 30,
    bomb: 0,
    goldenBerry: 25,
    crumb: 5,
    mushroom: 0,
    vitamin: 0,
  },
  /** Mushroom gamble: eating one yields a random integer mass delta within `[minDelta, maxDelta]` — high upside, real downside. Rolled server-side at eat time, so the outcome never leaks in the snapshot. */
  mushroom: { minDelta: -20, maxDelta: 40 },
  /** Vitamin: a pickup granting a `shield` for `shieldMs` — suspends decay AND wards off all incoming damage (bomb/rock/rotten). A short window of full invulnerability; rare on purpose. */
  vitamin: { shieldMs: 10_000 },
  /** Collision between falling/resting items and drifting Pokémon (resolved in applyTick). */
  collision: {
    /** Normalized hit radius (0..1). An item resolves against the closest alive Pokémon within this distance. Single radius — the scene isn't square, so it's approximate and intentionally generous. */
    radius: 0.08,
    /** Mass removed when a rock bonks a Pokémon (collision only; clicking a rock still does nothing). */
    rockDamage: -15,
  },
  /** Relative spawn weights per item type (not percentages — normalized by the sum of weights). */
  spawnWeights: {
    food: 55,
    rotten: 15,
    rock: 20,
    rareCandy: 5,
    bomb: 10,
    goldenBerry: 5,
    crumb: 35,
    mushroom: 12,
    vitamin: 8,
  },
  /** Bomb tunables: a slow-falling item juggled by clicks that explodes on contact, hitting everyone in range (incl. its owner). */
  bomb: {
    /** Mass removed from each Pokémon caught in the blast. */
    damage: -25,
    /** Normalized blast radius (0..1) around the blast point; alive Pokémon within it are hit. */
    blastRadius: 0.18,
    /** Fallback horizontal shift per click when the client sends no displacement — away from the nearest edge, normalized 0..1. */
    nudgeStep: 0.15,
    /** Safety cap on the client-supplied bat displacement (normalized 0..1), so one click can't fling the bomb across the scene. */
    maxNudge: 0.3,
  },
  /** `[min, max]` ms between item spawns at `spawnReferencePlayers`; the actual interval is picked randomly within the range, then scaled by active-player count. */
  spawnIntervalMsRange: [700, 1300],
  /** Active-player count at which the spawn interval matches `spawnIntervalMsRange` as-is. The interval scales by `spawnReferencePlayers / activePlayers`, so per capita food income stays ~constant. */
  spawnReferencePlayers: 3,
  /** Item fall speed by type, normalized scene-height units per second (1 = full height). 0.15 ≈ 6.7 s to cross; rock is heavier so it falls a bit faster, crumb is light-but-quick, goldenBerry drops a touch faster (catch it before it's gone). */
  fallSpeed: {
    food: 0.15,
    rotten: 0.15,
    rock: 0.2,
    rareCandy: 0.15,
    bomb: 0.035,
    goldenBerry: 0.18,
    crumb: 0.25,
    mushroom: 0.15,
    vitamin: 0.15,
  },
  /** How long an item lies on the floor (still edible) after landing before it disappears, ms. */
  itemRestMs: 3000,
  /** `[min, max]` horizontal spawn position of an item (normalized 0..1), inset from the scene edges. */
  itemSpawnXRange: [0.05, 0.95],
  /** Rectangular zone (normalized 0..1) Pokémon spawn and drift within — the lower ~2/3 of the scene, inset so sprites stay fully visible. They bounce off all four edges. */
  playerDriftZone: { minX: 0.08, maxX: 0.92, minY: 0.4, maxY: 0.92 },
  /** Pokémon drift speed, normalized units per second (applied to both axes via a random initial angle). Slow on purpose. */
  playerDriftSpeed: 0.03,
  /** Player steering: tapping empty water adds a velocity impulse toward the tap, on top of the current drift. */
  steer: {
    /** Velocity added toward the tapped point per tap (normalized units/sec). ~0.7× the base drift, so a tap gently bends the heading. */
    impulse: 0.02,
    /** Hard cap on a Pokémon's total drift speed after steering (normalized units/sec), so repeated taps can't fling it across the scene. ~2.3× the base drift. */
    maxSpeed: 0.07,
  },
  /** Minimum 2D distance kept between Pokémon when picking a spawn point (best-effort). */
  playerSpawnMinDistance: 0.12,
  /** How many random points to try before falling back to the last one when the scene is crowded. */
  playerSpawnMaxAttempts: 12,
  /** Grace period after disconnect, ms: the Pokémon stays in the room (greyed out, decay continues) and may rejoin on reconnection; purged afterward. */
  graceMs: 15_000,
  /** Delay after fainting, ms, during which the "Pick a new one" button is disabled (anti-instant-respawn farming). */
  cooldownAfterFaintedMs: 3_000,
  /** Mass below which the client shows a low-mass warning. */
  lowMassWarningThreshold: 6,
  /** Hard cap of players in a room; beyond it `onConnect` sends `roomFull` and closes the connection. */
  maxPlayers: 20,
  /** Hard cap of simultaneous connections (incl. multi-tab and not-yet-joined spectators); bounds idle/non-joining connects that `maxPlayers` alone does not. */
  maxConnections: 60,
  /** Sliding click rate-limit window, ms. */
  clickRateLimitWindowMs: 1000,
  /** Max clicks allowed within `clickRateLimitWindowMs`; beyond it the click is ignored (anti-spam/autoclicker). */
  clickRateLimitMax: 10,
} as const;
