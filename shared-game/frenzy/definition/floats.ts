import type { FloatsSpec } from '../../engine/definition';

/** Floating-message tunables shared by server (stamps it onto game events) and client (renders the column). */
export const FLOATS = {
  /** Release order within a player's floating column: higher floats up first, ties break FIFO. Keyed by game
   * event type (server stamps these) and by client-only status kind (mood/presence quips). */
  floatPriority: {
    fainted: 100,
    died: 100,
    dying: 90,
    detonated: 80,
    evolved: 70,
    effectGranted: 60,
    shield: 60,
    wellFed: 60,
    laying: 60,
    pooping: 60,
    bumped: 50,
    eaten: 40,
    happy: 30,
    sad: 30,
    appeared: 20,
    poke: 10,
    // NPC (angry-bomb) quips — same tiers as their human counterparts.
    npcDied: 100,
    npcAppeared: 20,
    npcPoke: 10,
  },
} as const satisfies FloatsSpec;
