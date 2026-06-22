import { describe, expect, it } from 'vitest';

import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import type { HumanPlayer, NpcPlayer, Player, ServerState } from '@game/frenzy/types';

import { applyDecayStep } from '../core/tick/apply-decay-step';
import { TEST_BODY } from './test-body';

const DECAY = FRENZY_DEFINITION.hp.decayPerTick;
const NPC_DECAY = FRENZY_DEFINITION.npcs.angryBomb.decayPerStep;

function human(overrides: Partial<HumanPlayer> = {}): Player {
  return {
    kind: 'human',
    id: 'p1',
    name: 'Ash',
    appearance: 'caterpie',
    body: TEST_BODY,
    stage: 1,
    hp: 100,
    mana: 0,
    x: 0.5,
    y: 0.5,
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

function angryBomb(overrides: Partial<NpcPlayer> = {}): Player {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: 'npc-1',
    name: 'angryBomb',
    appearance: 'angryBomb',
    body: TEST_BODY,
    stage: 1,
    hp: 50,
    mana: 0,
    x: 0.5,
    y: 0.9,
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

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('applyDecayStep', () => {
  it('drains a human by decayPerTick and emits no event while it survives', () => {
    const { state, events } = applyDecayStep(FRENZY_DEFINITION, stateWith([human({ hp: 100 })]));

    expect(state.players[0].hp).toBe(100 - DECAY);
    expect(events).toEqual([]);
  });

  it('faints a human that reaches 0 (removed from survivors, decay-cause event)', () => {
    const { state, events } = applyDecayStep(FRENZY_DEFINITION, stateWith([human({ hp: DECAY })]));

    expect(state.players).toEqual([]);
    expect(events).toEqual([{ type: 'fainted', playerId: 'p1', cause: { by: 'decay' } }]);
  });

  it('skips an actor whose active effect declares decayPaused (shield)', () => {
    const shielded = human({ hp: 50, effects: [{ kind: 'shield', expiresAt: 10_000 }] });
    const { state, events } = applyDecayStep(FRENZY_DEFINITION, stateWith([shielded]));

    expect(state.players[0].hp).toBe(50);
    expect(events).toEqual([]);
  });

  it('drains an NPC by its own decayPerStep, not the human rate', () => {
    const { state } = applyDecayStep(FRENZY_DEFINITION, stateWith([angryBomb({ hp: 50 })]));

    expect(state.players[0].hp).toBe(50 - NPC_DECAY);
  });

  it('keeps a starved NPC at hp 0 instead of fainting it (the blast pass owns its death)', () => {
    const { state, events } = applyDecayStep(
      FRENZY_DEFINITION,
      stateWith([angryBomb({ hp: NPC_DECAY })]),
    );

    expect(state.players).toHaveLength(1);
    expect(state.players[0].hp).toBe(0);
    expect(events).toEqual([]);
  });
});
