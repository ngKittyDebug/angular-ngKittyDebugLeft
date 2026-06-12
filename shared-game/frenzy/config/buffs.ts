/** Item-specific behaviour tunables: the gamble (mushroom), the timed pickups (vitamin/shield/easter egg) and the bomb. */
export const BUFFS = {
  /** Mushroom gamble: eating one yields a random integer mass delta within `[minDelta, maxDelta]` — high upside, real downside. Rolled server-side at eat time, so the outcome never leaks in the snapshot. */
  mushroom: { minDelta: -20, maxDelta: 40 },
  /** Vitamin: a pickup that heals `hp` mass at once and grants `wellFed` for `decayPauseMs` — pausing only the
   * natural mass decay (incoming damage from bombs/rocks/rotten still lands). A steady "keep-fed" buff, not a ward. */
  vitamin: { hp: 20, decayPauseMs: 60_000 },
  /** Shield: a pickup granting a `shield` for `shieldMs` — suspends decay AND wards off all incoming damage (bomb/rock/rotten). A short window of full invulnerability inside a bubble; rare on purpose. */
  shield: { shieldMs: 10_000 },
  /** Easter egg: a pickup that heals `hpOnPickup` mass and grants `laying` for `durationMs`. While active, the
   * Pokémon randomly emits a falling item from itself each tick with probability `emitChancePerTick` (any type,
   * incl. bombs). Each item spawns at the layer's lower-rear (offset `emitBack` behind + `emitDown` below its
   * centre) and is launched backward at `emitBackSpeed` (opposite the heading) — it sprays out behind, like it's
   * being flung. Emitted items carry the layer's `ownerId`, so they never collide with or blast their owner. */
  easterEgg: {
    durationMs: 8000,
    emitChancePerTick: 0.12,
    hpOnPickup: 10,
    emitBack: 0.05,
    emitDown: 0.03,
    emitBackSpeed: 0.12,
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
} as const;
