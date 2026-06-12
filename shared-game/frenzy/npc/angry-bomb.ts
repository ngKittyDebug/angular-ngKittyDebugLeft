/**
 * Server-side descriptor for the angry-bomb NPC. The server spawns this autobot itself (humans send their `body`
 * on `join`, an NPC has none), so it needs an opaque per-stage body, starting hp and mana right here. The client
 * resolves the `'angryBomb'` appearance to a sprite separately (see `pokemon-registry.ts`) — this file is roster-
 * agnostic on the server, the numbers are opaque tuning. The square hitbox walks the seabed slower than a Pokémon.
 */
import type { PlayerBody } from '../types';

export const ANGRY_BOMB: {
  appearance: string;
  startingHp: number;
  startingMana: number;
  body: PlayerBody;
} = {
  appearance: 'angryBomb',
  startingHp: 100,
  startingMana: 0,
  // Independently-tuned NPC stage gates (NOT bound to the client's human STAGE_BODY table — they happen to use the
  // same 0 / 200 / 500 today, but tune them here without touching player balance); square hitbox, slower than a Pokémon.
  body: {
    1: { width: 64, height: 64, speed: 0.02, maxSpeed: 0.04, hp: 0 },
    2: { width: 88, height: 88, speed: 0.018, maxSpeed: 0.036, hp: 200 },
    3: { width: 112, height: 112, speed: 0.016, maxSpeed: 0.032, hp: 500 },
  },
};
