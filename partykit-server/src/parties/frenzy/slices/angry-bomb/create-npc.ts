import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { NpcPlayer } from '@game/frenzy/types';

import { calculateStage } from '../../../../engine/core/calculate-stage';

export interface CreateNpcInput {
  now: number;
  rng?: () => number;
}

/**
 * Build the angry-bomb NPC autobot. Mirrors `createPlayer`, but the server owns the descriptor (humans send their
 * `body`/`appearance` on `join`; an NPC has none) — body, appearance and starting hp/mana come from the definition
 * slice. Spawns on the seabed (`floorY`) at a random x in the item spawn band, motionless (the `moveNpc` runtime
 * hook drives its seek movement). It carries NO spawn-shield: it's a hazard, not a peer. The id is a fresh UUID so it can never collide
 * with a human session-token id.
 */
export function createNpc({ now, rng = Math.random }: CreateNpcInput): NpcPlayer {
  const [minX, maxX] = FRENZY.itemSpawnXRange;

  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: crypto.randomUUID(),
    name: ANGRY_BOMB_NPC.appearance,
    appearance: ANGRY_BOMB_NPC.appearance,
    body: ANGRY_BOMB_NPC.body,
    stage: calculateStage(ANGRY_BOMB_NPC.startingHp, ANGRY_BOMB_NPC.body),
    hp: ANGRY_BOMB_NPC.startingHp,
    mana: ANGRY_BOMB_NPC.startingMana,
    x: minX + rng() * (maxX - minX),
    y: ANGRY_BOMB_NPC.floorY,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: now,
    effects: [],
    scores: {},
  };
}
