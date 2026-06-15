import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';

import { calculateStage } from '../../../../../engine/core/calculate-stage';
import { createNpc } from '../create-npc';

describe('createNpc', () => {
  it('builds a well-formed angry-bomb NPC player', () => {
    const npc = createNpc({ now: 1700000000, rng: () => 0 });

    expect(npc).toMatchObject({
      kind: 'npc',
      npcKind: 'angryBomb',
      appearance: ANGRY_BOMB_NPC.appearance,
      body: ANGRY_BOMB_NPC.body,
      hp: ANGRY_BOMB_NPC.startingHp,
      mana: ANGRY_BOMB_NPC.startingMana,
      stage: calculateStage(ANGRY_BOMB_NPC.startingHp, ANGRY_BOMB_NPC.body),
      vx: 0,
      vy: 0,
      status: 'alive',
      disconnectedAt: null,
      joinedAt: 1700000000,
      effects: [],
      scores: {},
    });
  });

  it('locks the NPC to the seabed floorY', () => {
    const npc = createNpc({ now: 0, rng: () => 0.5 });

    expect(npc.y).toBe(FRENZY.npc.floorY);
  });

  it('places the NPC within the item spawn x band', () => {
    const [minX, maxX] = FRENZY.itemSpawnXRange;
    const npc = createNpc({ now: 0, rng: () => 0.5 });

    expect(npc.x).toBeGreaterThanOrEqual(minX);
    expect(npc.x).toBeLessThanOrEqual(maxX);
  });

  it('gives the NPC a fresh non-empty id (no human session-token collision)', () => {
    const first = createNpc({ now: 0 });
    const second = createNpc({ now: 0 });

    expect(first.id).not.toBe('');
    expect(first.id).not.toBe(second.id);
  });
});
