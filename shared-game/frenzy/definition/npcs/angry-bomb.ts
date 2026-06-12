import type { NpcDefinition } from '../../../engine/definition';
import type { Stage } from '../../../engine/types';
import type { ItemKey } from '../items';

/**
 * The angry-bomb autobot's full definition: the engine-level spawn/identity contract (`NpcDefinition`) plus its
 * kind-specific behaviour tuning — what it seeks, how it walks the seabed, how its anger meter charges and how
 * hard the rage blast hits. The runtime CODE consuming this stays in the server's NPC module (slice in phase 5).
 */
export interface AngryBombDefinition extends NpcDefinition {
  /** Item types it seeks (the benign pool — D5): it steers toward the nearest RESTING one and eats it via the
   * shared collision pass; it never hunts hazards but still suffers from them on contact. */
  seekItemTypes: readonly ItemKey[];
  /** Normalized y it hovers around (seabed; within the player drift zone, near the item rest band). */
  floorY: number;
  /** Gentle vertical wander around `floorY` — a sum of two sine harmonics (slow + a faster, non-integer-ratio
   * overtone) so the path reads organic; `amplitudeY` is the peak deviation and stays inside the sandy rest band. */
  floorBob: { amplitudeY: number; periodTicks: number };
  /** Re-pick the nearest resting edible every N ticks (not every tick). */
  retargetEveryTicks: number;
  /** Anger gained per poke scales superlinearly with the poke count in the sliding `windowMs` window — a lone
   * poke is ~0 (just a quip), a rapid burst ramps fast; `max` triggers the strong blast; `cooldownPerTick` bleeds
   * anger passively. `max` is high (and cooldown brisk) so the rage blast takes ~16–24 SUSTAINED pokes and the
   * reddening climbs visibly the whole way up. */
  anger: { windowMs: number; base: number; max: number; cooldownPerTick: number };
  /** At max anger it blasts harder than a normal mine, scaled by its stage; the base damage/radius reuse the
   * bomb item's blast. The weak (starvation) blast uses the bomb's blast unscaled. */
  strongBlast: {
    stageDamageMultiplier: Record<Stage, number>;
    stageRadiusMultiplier: Record<Stage, number>;
  };
}

/** Tuning defaults are starting points — final values are playtest-tuned. */
export const ANGRY_BOMB_NPC = {
  enabled: true,
  appearance: 'angryBomb',
  startingHp: 100,
  startingMana: 0,
  // Independently-tuned NPC stage gates (NOT bound to the client's human STAGE_BODY table — they happen to use the
  // same 0 / 200 / 500 today, but tune them here without touching player balance); square hitbox, slower than a human.
  body: {
    1: { width: 64, height: 64, speed: 0.02, maxSpeed: 0.04, hp: 0 },
    2: { width: 88, height: 88, speed: 0.018, maxSpeed: 0.036, hp: 200 },
    3: { width: 112, height: 112, speed: 0.016, maxSpeed: 0.032, hp: 500 },
  },
  spawnDelayMsRange: [0, 20_000],
  respawnDelayMs: 40_000,
  seekItemTypes: ['food', 'crumb', 'rareCandy', 'goldenBerry', 'mushroom', 'vitamin', 'easterEgg'],
  floorY: 0.9,
  floorBob: { amplitudeY: 0.018, periodTicks: 70 },
  retargetEveryTicks: 5,
  decayPerStep: 3,
  anger: { windowMs: 1500, base: 5, max: 400, cooldownPerTick: 1 },
  strongBlast: {
    stageDamageMultiplier: { 1: 1, 2: 1.6, 3: 2.4 },
    stageRadiusMultiplier: { 1: 1, 2: 1.3, 3: 1.6 },
  },
} as const satisfies AngryBombDefinition;
