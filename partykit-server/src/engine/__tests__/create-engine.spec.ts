import { describe, expect, it } from 'vitest';

import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import type { NpcPlayer, Player, ServerState } from '@game/frenzy/types';

import { createEngine } from '../create-engine';
import { TEST_BODY } from './test-body';

const HUMAN: Player = {
  kind: 'human',
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  body: TEST_BODY,
  stage: 1,
  hp: 100,
  mana: 0,
  x: 0.3,
  y: 0.6,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
  scores: {},
};

const NPC: NpcPlayer = {
  kind: 'npc',
  npcKind: 'angryBomb',
  id: 'npc-1',
  name: 'angryBomb',
  appearance: 'angryBomb',
  body: TEST_BODY,
  stage: 1,
  hp: 50,
  mana: 40,
  x: 0.7,
  y: 0.9,
  vx: 0.02,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
  scores: {},
};

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('createEngine', () => {
  // The default-registry seam is what a second game WITHOUT NPCs relies on — pin that an omitted registry leaves
  // an NPC fully inert (no movement, no blasts, no anger cooldown) while the rest of the tick still runs.
  it('leaves NPCs inert when no npc registry is supplied (empty default)', () => {
    const engine = createEngine(FRENZY_DEFINITION);

    const { state: next, events } = engine.applyTick(stateWith([HUMAN, NPC]), 0.1, false);
    const npc = next.players.find((player) => player.id === 'npc-1');

    expect(npc).toBeDefined();
    expect(npc?.x).toBe(NPC.x);
    expect(npc?.y).toBe(NPC.y);
    expect(npc?.mana).toBe(NPC.mana);
    expect(events).toEqual([]);
  });

  it('binds spawnItem to the game (smoke: a seeded spawn yields a roster item inside the spawn band)', () => {
    const engine = createEngine(FRENZY_DEFINITION);
    const rolls = [0, 0.5];
    let index = 0;
    const item = engine.spawnItem(
      () => rolls[index++],
      () => 'spawned-1',
    );
    const [minX, maxX] = FRENZY_DEFINITION.spawn.xRange;

    expect(item.id).toBe('spawned-1');
    expect(Object.keys(FRENZY_DEFINITION.items)).toContain(item.type);
    expect(item.x).toBeGreaterThanOrEqual(minX);
    expect(item.x).toBeLessThanOrEqual(maxX);
  });
});
