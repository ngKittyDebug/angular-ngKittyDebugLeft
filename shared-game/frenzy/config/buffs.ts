/** Item-specific behaviour tunables: the gamble (mushroom), the timed pickups (vitamin/shield/easter egg) and the bomb. */
export const BUFFS = {
  /** Mushroom gamble: eating one yields a random integer hp delta within `[minDelta, maxDelta]` — high upside, real downside. Rolled server-side at eat time, so the outcome never leaks in the snapshot. */
  mushroom: { minDelta: -20, maxDelta: 40 },
  /** Vitamin: a pickup that heals `hp` hp at once and grants `wellFed` for `decayPauseMs` — pausing only the
   * natural hp decay (incoming damage from bombs/rocks/rotten still lands). A steady "keep-fed" buff, not a ward. */
  vitamin: { hp: 20, decayPauseMs: 60_000 },
  /** Shield: a pickup granting a `shield` for `shieldMs` — suspends decay AND wards off all incoming damage (bomb/rock/rotten). A short window of full invulnerability inside a bubble; rare on purpose. `spawnShieldMs` is the
   * SHORTER ward auto-granted on join/respawn (not a pickup) so a freshly-spawned Pokémon gets a brief grace
   * window before it can be killed — reuses the same effect/aura, just a smaller duration. */
  shield: { shieldMs: 15_000, spawnShieldMs: 3_000 },
  /** Easter egg: a pickup that heals `hpOnPickup` hp and grants `laying` for `durationMs`. While active, the
   * Pokémon drips one falling item from itself every `emitIntervalMs` (any type, incl. bombs) — a steady, predictable
   * count per aura (`durationMs / emitIntervalMs`) rather than a random per-tick burst. Each item spawns at the body's
   * lower-rear EDGE — `emitBack`/`emitDown` are the small gaps PAST the body edge (the server adds half the body size
   * first, so emission scales with the Pokémon) behind + below — and is launched backward at `emitBackSpeed` (opposite
   * the heading) — it sprays out behind, like it's being flung. Emitted items carry the layer's `ownerId`, so they
   * never collide with or blast their owner. */
  easterEgg: {
    durationMs: 10_000,
    emitIntervalMs: 1500,
    hpOnPickup: 10,
    emitBack: 0.012,
    emitDown: 0.008,
    emitBackSpeed: 0.08,
    /** Max random rotation (radians, ±) applied to each item's launch vector, so a burst fans out in a cone
     * instead of every item flying the identical way and lining up. Kept under the bomb's ~0.5 rad horizontal
     * limit so nothing ever launches upward. */
    emitAngleJitter: 0.4,
  },
  /** Poop: the cursed twin of the easter egg. Eating it deals `hpOnPickup` (negative) damage and grants `pooping`
   * for `durationMs` — same emission loop as `laying`, but the Pokémon only drips rock/brick/bomb (the nasty pool)
   * out behind itself every `emitIntervalMs`. Shares the egg's launch geometry (`emitBack`/`emitDown` as
   * gaps past the body edge / `emitBackSpeed`). Emitted items carry the layer's `ownerId`, so they never collide
   * with or blast their owner. */
  poop: {
    durationMs: 10_000,
    emitIntervalMs: 1000,
    hpOnPickup: -10,
    emitBack: 0.012,
    emitDown: 0.008,
    emitBackSpeed: 0.1,
    /** Max random rotation (radians, ±) applied to each item's launch vector, so a burst fans out in a cone
     * instead of every item flying the identical way and lining up (most obvious with the heavy bombs). */
    emitAngleJitter: 0.4,
  },
  /** Bomb tunables: a sea mine that drifts at constant velocity with wall bounce (NO gravity — it steers like a
   * Pokémon, so client and server agree frame-for-frame and the vertical reads as smooth as the horizontal), is
   * shoved in 2D by clicks, and explodes on contact — damage and knockback both fall off with distance from the
   * epicentre, hitting everyone in range (incl. its owner). It still settles: it spawns with a gentle downward `vy`
   * (`fallSpeed.bomb`) and coasts down to the seabed (where it detonates) unless players shove it off that course. */
  bomb: {
    /** Hp removed at the epicentre (t=0). Falls off quadratically toward the radius edge: `maxDamage·(1−t)²`. */
    maxDamage: -40,
    /** Floor on blast damage by magnitude: anyone inside the radius loses at least this much (the quadratic never weaker). */
    minDamage: -6,
    /** Normalized blast radius (0..1) around the blast point; alive Pokémon within it are hit. */
    blastRadius: 0.18,
    /** Velocity (normalized units/sec) a click adds to the bomb's drift — a gentle inertial shove away from the
     * tapped side (not a teleport). Kept below `maxDriftSpeed` so building up to the cap takes a couple of taps →
     * tug-of-war stays a back-and-forth. */
    clickImpulse: 0.012,
    /** Hard cap on the bomb's overall drift speed `|v|` (normalized units/sec) — the absolute ceiling click shoves
     * and wall bounces are clamped to (see move-items + applyClick), so the mine never moves faster than this in any
     * direction. With no gravity the bomb's velocity only changes on a shove or a wall bounce, so this cap is the
     * sole speed limit. Set above a Pokémon's cruising speed (~0.024–0.032) but a touch below their max steer cap
     * (0.055–0.075), so a well-shoved mine runs down a drifting target — a real aimed weapon — yet a player actively
     * fleeing at full tilt can still just outrun it. */
    maxDriftSpeed: 0.05,
    /** Launch speed (normalized units/sec) for a bomb sprayed by the `pooping` aura — far gentler than the shared
     * `emitBackSpeed` (tuned for the lighter rock/brick), so the heavy mine eases out near its own drift cap rather
     * than shooting out at several times the cap and snapping back on the next tick. */
    emitBackSpeed: 0.018,
    /** Radial knockback velocity (normalized units/sec) at the epicentre (t=0); falls off quadratically `blastImpulse·(1−t)²`, added to a caught Pokémon's velocity. */
    blastImpulse: 0.1,
    /** Post-blast speed cap as a multiple of the stage's `maxSpeed`: knockback may briefly exceed cruising speed but no more than this. */
    blastImpulseMaxFactor: 1.3,
    /** Inclusive [min, max] hidden click-budget a freshly spawned mine gets (see Item.clicksLeft); each shove-click
     * spends one, the last one detonates it. */
    clicksToExplodeRange: [4, 10],
  },
} as const;
