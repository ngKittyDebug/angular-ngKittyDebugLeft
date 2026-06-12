import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type {
  DetonatedEvent,
  FaintedEvent,
  NpcPlayer,
  Player,
  ServerState,
} from '@game/frenzy/types';

import { applyNpcBlasts } from '../npc-blast';
import { TEST_BODY } from '../../../../../engine/__tests__/test-body';

function makeNpc(overrides: Partial<NpcPlayer> = {}): NpcPlayer {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: 'npc-1',
    name: ANGRY_BOMB_NPC.appearance,
    appearance: ANGRY_BOMB_NPC.appearance,
    body: ANGRY_BOMB_NPC.body,
    stage: 1,
    hp: 100,
    mana: 0,
    x: 0.5,
    y: FRENZY.npc.floorY,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
    ...overrides,
  };
}

function makeHuman(id: string, x: number, y: number): Player {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'caterpie',
    body: TEST_BODY,
    stage: 1,
    hp: 100,
    mana: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

const detonatedOf = (events: ReturnType<typeof applyNpcBlasts>['events']): DetonatedEvent[] =>
  events.filter((event): event is DetonatedEvent => event.type === 'detonated');
const hitIdsOf = (detonated: DetonatedEvent): string[] => detonated.hits.map((hit) => hit.playerId);
const faintedOf = (events: ReturnType<typeof applyNpcBlasts>['events']): FaintedEvent[] =>
  events.filter((event): event is FaintedEvent => event.type === 'fainted');

describe('applyNpcBlasts', () => {
  it('is a no-op when no NPC should detonate', () => {
    const state = stateWith([makeNpc({ mana: 10, hp: 100 }), makeHuman('p1', 0.5, 0.5)]);
    const result = applyNpcBlasts(state);

    expect(result.state).toBe(state);
    expect(result.events).toHaveLength(0);
  });

  it('strong-blasts at max anger, removes the NPC and emits detonated + fainted', () => {
    const npc = makeNpc({ mana: FRENZY.npc.anger.max });
    const victim = makeHuman('p1', 0.5, FRENZY.npc.floorY); // sitting on the NPC
    const result = applyNpcBlasts(stateWith([npc, victim]));

    expect(result.state.players.some((player) => player.id === npc.id)).toBe(false);

    const detonated = detonatedOf(result.events);

    expect(detonated).toHaveLength(1);
    expect(detonated[0].itemId).toBe(npc.id);
    expect(hitIdsOf(detonated[0])).toContain('p1');
    expect(faintedOf(result.events).some((event) => event.playerId === npc.id)).toBe(true);
  });

  it('scales the strong blast radius and damage by stage', () => {
    // A human just outside the stage-1 radius but inside the stage-3 radius proves the radius scaled up.
    const edge = FRENZY.bomb.blastRadius * 1.4; // between ×1 (s1) and ×1.6 (s3)
    const farHuman = () => makeHuman('p1', 0.5 + edge, FRENZY.npc.floorY);

    const stage1 = applyNpcBlasts(
      stateWith([makeNpc({ mana: FRENZY.npc.anger.max, stage: 1 }), farHuman()]),
    );
    const stage3 = applyNpcBlasts(
      stateWith([makeNpc({ mana: FRENZY.npc.anger.max, stage: 3 }), farHuman()]),
    );

    expect(hitIdsOf(detonatedOf(stage1.events)[0])).not.toContain('p1'); // out of the small radius
    expect(hitIdsOf(detonatedOf(stage3.events)[0])).toContain('p1'); // inside the bigger radius
    expect(detonatedOf(stage3.events)[0].radius).toBeGreaterThan(
      detonatedOf(stage1.events)[0].radius,
    );
  });

  it('never hits the detonating NPC itself (O8)', () => {
    const npc = makeNpc({ mana: FRENZY.npc.anger.max });
    const result = applyNpcBlasts(stateWith([npc]));

    expect(hitIdsOf(detonatedOf(result.events)[0])).not.toContain(npc.id);
    expect(faintedOf(result.events).filter((event) => event.playerId === npc.id)).toHaveLength(1);
  });

  it('weak-blasts on starvation (hp 0) with base item-mine radius and a decay cause', () => {
    const npc = makeNpc({ hp: 0, mana: 0, stage: 3 });
    const result = applyNpcBlasts(stateWith([npc]));

    const detonated = detonatedOf(result.events);

    expect(detonated).toHaveLength(1);
    // Base radius even though the NPC is stage 3 — starvation blast is a plain mine, unscaled.
    expect(detonated[0].radius).toBe(FRENZY.bomb.blastRadius);
    expect(faintedOf(result.events).find((event) => event.playerId === npc.id)?.cause).toEqual({
      by: 'decay',
    });
  });

  it('prefers the strong blast when mana is max AND hp is 0 in the same tick', () => {
    // A rage-poked NPC that also starved out this tick takes the STRONG path (stage-scaled, causeless), not weak.
    const npc = makeNpc({ mana: FRENZY.npc.anger.max, hp: 0, stage: 2 });
    const result = applyNpcBlasts(stateWith([npc]));

    expect(detonatedOf(result.events)[0].radius).toBe(
      FRENZY.bomb.blastRadius * FRENZY.npc.strongBlast.stageRadiusMultiplier[2],
    );
    expect(
      faintedOf(result.events).find((event) => event.playerId === npc.id)?.cause,
    ).toBeUndefined();
  });
});
