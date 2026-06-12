import type { PlayerCollisionSpec } from '../../engine/definition';

/**
 * Player-vs-player soft-separation + mini-bump tunables (incl. the pass's feature flag). Distances are world px;
 * velocities are normalized units/sec like the rest of the physics. The solver is a single, non-iterative pass
 * per tick — `relaxation` and `slopPx` make a cluster (incl. corners) settle without jitter or runaway, instead
 * of iterating to convergence within a tick.
 */
export const PLAYER_COLLISION = {
  /** Player↔player collision (soft separation + mini-bump). Off → players pass through each other (legacy). */
  enabled: true,
  /** Fraction of remaining penetration corrected per tick (Baumgarte relaxation). <1 → smooth convergence over
   * a few ticks with no overshoot or oscillation. */
  relaxation: 0.5,
  /** Penetration tolerance (world px): overlaps shallower than this are left uncorrected, so a jammed cluster
   * settles into a tiny static overlap instead of perpetually nudging — the anti-jitter floor. */
  slopPx: 2,
  /** Restitution along the contact normal (0..1). 0 = inelastic: bodies stop pressing into each other but don't
   * spring apart. The normal-velocity solver removes exactly the approaching component; tangential drift is kept. */
  restitution: 0,
  /** Per-body positional-correction cap per tick (world px): bounds the shove from a deep/teleported overlap so a
   * body can never be flung across the scene in one tick. */
  maxCorrectionPx: 40,
  /** Closing speed along the contact normal (normalized units/sec) above which a contact counts as a deliberate
   * ram — below it, contacts separate silently. Sized above cruise drift so lazy bumping never deals damage. */
  bumpSpeedThreshold: 0.05,
  /** Hp removed from each player on a qualifying ram (negative). Light — collisions jostle, they don't kill. */
  bumpDamage: -5,
  /** Base extra knockback along the normal on a ram (normalized units/sec), split by inverse mass (the heavier
   * player is shoved back less). Final speed is capped downstream by `applyImpulses`. */
  bumpImpulse: 0.04,
  /** Extra knockback per unit of closing speed above the threshold — a harder ram shoves harder. */
  bumpImpulseScale: 0.5,
  /** Post-kick speed cap (× the victim's stage `maxSpeed`) stamped on every impulse this pass produces. Matches
   * the bomb blast's `blastImpulseMaxFactor`, which historically capped ALL knockback globally in `applyImpulses`. */
  impulseMaxFactor: 1.3,
} as const satisfies PlayerCollisionSpec;
