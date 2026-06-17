import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { NpcPlayer } from '@game/frenzy/types';

import { coolAnger } from '../cool-anger';

function makeNpc(mana: number): NpcPlayer {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: 'npc-1',
    name: ANGRY_BOMB_NPC.appearance,
    appearance: ANGRY_BOMB_NPC.appearance,
    body: ANGRY_BOMB_NPC.body,
    stage: 1,
    hp: 100,
    mana,
    x: 0.5,
    y: FRENZY.npc.floorY,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

// Humans never reach this hook — the registry adapter dispatches NPCs only (see the npc-registry spec).
describe('coolAnger', () => {
  it('bleeds cooldownPerTick mana off the NPC each tick', () => {
    const npc = coolAnger(makeNpc(50));

    expect(npc.mana).toBeCloseTo(50 - FRENZY.npc.anger.cooldownPerTick, 5);
  });

  it('floors NPC mana at 0', () => {
    const npc = coolAnger(makeNpc(FRENZY.npc.anger.cooldownPerTick / 2));

    expect(npc.mana).toBe(0);
  });
});
