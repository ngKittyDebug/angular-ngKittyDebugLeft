import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB } from '@game/frenzy/npc/angry-bomb';
import type { NpcPlayer } from '@game/frenzy/types';

import { calculateStage } from '../../calculate-stage';

export interface CreateNpcInput {
  now: number;
  rng?: () => number;
}

/**
 * Build the angry-bomb NPC autobot. Mirrors `createPlayer`, but the server owns the descriptor (humans send their
 * `body`/`appearance` on `join`; an NPC has none) — body, appearance and starting hp/mana come from `ANGRY_BOMB`.
 * Spawns on the seabed (`npc.floorY`) at a random x in the item spawn band, motionless (Phase 3 drives its seek
 * movement). It carries NO spawn-shield: it's a hazard, not a peer. The id is a fresh UUID so it can never collide
 * with a human session-token id.
 */
export function createNpc({ now, rng = Math.random }: CreateNpcInput): NpcPlayer {
  const [minX, maxX] = FRENZY.itemSpawnXRange;

  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: crypto.randomUUID(),
    name: ANGRY_BOMB.appearance,
    appearance: ANGRY_BOMB.appearance,
    body: ANGRY_BOMB.body,
    stage: calculateStage(ANGRY_BOMB.startingHp, ANGRY_BOMB.body),
    hp: ANGRY_BOMB.startingHp,
    mana: ANGRY_BOMB.startingMana,
    x: minX + rng() * (maxX - minX),
    y: FRENZY.npc.floorY,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: now,
    effects: [],
    scores: {},
  };
}
