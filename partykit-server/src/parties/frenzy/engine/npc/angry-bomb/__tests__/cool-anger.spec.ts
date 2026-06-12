import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB } from '@game/frenzy/npc/angry-bomb';
import type { NpcPlayer, Player } from '@game/frenzy/types';

import { coolAnger } from '../cool-anger';
import { TEST_BODY } from '../../../../__tests__/test-body';

function makeNpc(mana: number): NpcPlayer {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: 'npc-1',
    name: ANGRY_BOMB.appearance,
    appearance: ANGRY_BOMB.appearance,
    body: ANGRY_BOMB.body,
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

function makeHuman(mana: number): Player {
  return {
    kind: 'human',
    id: 'p1',
    name: 'Ash',
    appearance: 'caterpie',
    body: TEST_BODY,
    stage: 1,
    hp: 100,
    mana,
    x: 0.5,
    y: 0.6,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

describe('coolAnger', () => {
  it('bleeds cooldownPerTick mana off the NPC each tick', () => {
    const [npc] = coolAnger([makeNpc(50)]);

    expect(npc.mana).toBeCloseTo(50 - FRENZY.npc.anger.cooldownPerTick, 5);
  });

  it('floors NPC mana at 0', () => {
    const [npc] = coolAnger([makeNpc(FRENZY.npc.anger.cooldownPerTick / 2)]);

    expect(npc.mana).toBe(0);
  });

  it('leaves human mana untouched', () => {
    const [human] = coolAnger([makeHuman(7)]);

    expect(human.mana).toBe(7);
  });
});
