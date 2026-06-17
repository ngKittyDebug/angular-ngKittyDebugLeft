import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { Player, ServerState } from '@game/frenzy/types';

import { applyImpulses } from '../core/apply-impulses';
import { TEST_BODY } from './test-body';

const PLAYER: Player = {
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
};

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('applyImpulses', () => {
  it('is a no-op for an empty list (returns the same state)', () => {
    const state = stateWith([PLAYER]);

    expect(applyImpulses(state, [])).toBe(state);
  });

  it('adds the kick to the targeted player velocity', () => {
    const next = applyImpulses(stateWith([PLAYER]), [
      { playerId: 'p1', ix: 0.02, iy: -0.01, maxFactor: FRENZY.bomb.blastImpulseMaxFactor },
    ]);

    expect(next.players[0].vx).toBeCloseTo(0.02, 5);
    expect(next.players[0].vy).toBeCloseTo(-0.01, 5);
  });

  it('caps the resulting speed at blastImpulseMaxFactor × the stage maxSpeed', () => {
    const next = applyImpulses(stateWith([PLAYER]), [
      { playerId: 'p1', ix: 5, iy: 0, maxFactor: FRENZY.bomb.blastImpulseMaxFactor },
    ]);
    const cap = TEST_BODY[1].maxSpeed * FRENZY.bomb.blastImpulseMaxFactor;

    expect(Math.hypot(next.players[0].vx, next.players[0].vy)).toBeCloseTo(cap, 5);
  });

  it('sums multiple kicks on the same player before capping', () => {
    const next = applyImpulses(stateWith([PLAYER]), [
      { playerId: 'p1', ix: 0.01, iy: 0, maxFactor: FRENZY.bomb.blastImpulseMaxFactor },
      { playerId: 'p1', ix: 0.01, iy: 0, maxFactor: FRENZY.bomb.blastImpulseMaxFactor },
    ]);

    expect(next.players[0].vx).toBeCloseTo(0.02, 5);
  });

  it('ignores a kick aimed at a player not in the state', () => {
    const next = applyImpulses(stateWith([PLAYER]), [
      { playerId: 'ghost', ix: 0.05, iy: 0, maxFactor: FRENZY.bomb.blastImpulseMaxFactor },
    ]);

    expect(next.players[0].vx).toBe(0);
  });
});
