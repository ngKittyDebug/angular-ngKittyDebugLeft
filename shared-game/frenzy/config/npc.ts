import type { ItemType } from '../types';

/** NPC gameplay tunables (the angry-bomb autobot). Defaults below are starting points — final values are playtest-tuned. */
export const NPC = {
  /** Item types the angry-bomb seeks (the benign pool — D5). It steers toward the nearest RESTING one of these and
   * eats it via the shared collision pass; it never hunts hazards (rock/brick/bomb/rotten/poop) but still suffers
   * from them on contact. */
  seekItemTypes: [
    'food',
    'crumb',
    'rareCandy',
    'goldenBerry',
    'mushroom',
    'vitamin',
    'easterEgg',
  ] as ItemType[],
  /** Random window (ms) after the first human joins before the NPC spawns: `[min, max]`. */
  spawnDelayMsRange: [0, 20_000],
  /** Delay (ms) after any NPC death before it respawns, repeated while humans remain. */
  respawnDelayMs: 40_000,
  /** Normalized y the NPC hovers around (seabed; within playerDriftZone.maxY 0.92, near item rest band 0.867–0.937). */
  floorY: 0.9,
  /** Gentle vertical wander so the NPC doesn't track a perfectly straight horizontal line. `y` oscillates around
   * `floorY` as a sum of two sine harmonics (slow + a faster, non-integer-ratio overtone for an organic, non-robotic
   * path); `amplitudeY` is the peak deviation and stays inside the sandy rest band (0.9 ± 0.018 → [0.882, 0.918],
   * under `maxY` 0.92). `vy` carries the analytic slope of this bob so the client extrapolates it smoothly. */
  floorBob: { amplitudeY: 0.018, periodTicks: 70 },
  /** Re-pick the nearest resting edible every N ticks (not every tick). */
  retargetEveryTicks: 5,
  /** Hp lost per decay step for the NPC (its own rate, independent of the Pokémon decay). */
  decayPerStep: 3,
  /** Anger gained per poke scales superlinearly with the number of pokes in the sliding `windowMs` window so a
   * lone poke is ~0 (just a quip) while a rapid double/triple ramps fast; `max` triggers the strong blast;
   * `cooldownPerTick` bleeds anger passively each tick. `max` is set high (and cooldown brisk) so reaching the
   * rage blast takes ~16–24 SUSTAINED pokes — the sprite reddening (driven by mana/max) then climbs visibly the
   * whole way up instead of spiking in the last couple of pokes before it detonates. */
  anger: { windowMs: 1500, base: 5, max: 400, cooldownPerTick: 1.0 },
  /** At max anger the NPC blasts harder than a normal mine, scaled by its evolution stage; the base damage/radius
   * reuse `FRENZY.bomb`. The weak (starvation) blast uses `FRENZY.bomb` unscaled. */
  strongBlast: {
    stageDamageMultiplier: { 1: 1, 2: 1.6, 3: 2.4 },
    stageRadiusMultiplier: { 1: 1, 2: 1.3, 3: 1.6 },
  },
} as const;
