import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

/**
 * The blast: damage and knockback both fall off quadratically with distance from the epicentre, hitting every
 * alive, unshielded player in range (incl. the shover). Triggered by touch (collision), by reaching the seabed
 * (land), or by spending the mine's hidden click budget.
 */
const BLAST = {
  verb: 'explode',
  /** Hp removed at the epicentre (t=0); falls off as `maxDamage·(1−t)²`. */
  maxDamage: -40,
  /** Floor on blast damage by magnitude: anyone inside the radius loses at least this much. */
  minDamage: -6,
  /** Normalized blast radius (0..1) around the blast point. */
  blastRadius: 0.18,
  /** Radial knockback velocity (normalized units/sec) at the epicentre; falls off quadratically. */
  blastImpulse: 0.1,
  /** Post-blast speed cap as a multiple of the victim's stage `maxSpeed`. */
  blastImpulseMaxFactor: 1.3,
} as const satisfies CoreInteractionSpec;

/**
 * Bomb: a sea mine that drifts at constant velocity with wall bounce (NO gravity — it steers like a player, so
 * client and server agree frame-for-frame), is shoved in 2D by clicks and explodes on contact, on landing, or on
 * its last budgeted click. `clickImpulse` stays below `maxDriftSpeed` so building up to the cap takes a couple of
 * taps (tug-of-war stays a back-and-forth); the cap sits above a player's cruising speed but below their max steer
 * cap, so a well-shoved mine runs down a drifter yet a fleeing player can outrun it.
 *
 * Physics overrides: `sizePx` — the collidable box is the rendered sensor-tip span (a mine goes off when a horn
 * sensor is touched, not just the shell); `catchGenerosity` 1 — true edge-to-edge contact, no catch assist (the
 * generous default made it detonate ~half a body early); `emitLaunchSpeed` — a poop-aura-sprayed bomb launches far
 * gentler than the shared spray speed, easing out near its own drift cap instead of overshooting and snapping back.
 */
export const BOMB_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.01, sizePx: 84, catchGenerosity: 1, emitLaunchSpeed: 0.018 },
  spawn: { world: 10, poopEmit: 7 },
  interactions: {
    onClick: {
      verb: 'nudge',
      clickImpulse: 0.012,
      maxDriftSpeed: 0.05,
      clicksToExplodeRange: [4, 10],
    },
    onCollide: BLAST,
    onLand: BLAST,
  },
} as const satisfies ItemDefinition<EffectKey>;
