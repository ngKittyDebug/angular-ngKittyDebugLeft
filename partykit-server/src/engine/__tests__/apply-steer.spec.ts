import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { Player, ServerState } from '@game/frenzy/types';

import { applySteer } from '../core/apply-steer';
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

describe('applySteer', () => {
  it('returns the same state reference when the player is unknown', () => {
    const state = stateWith([PLAYER]);

    expect(applySteer(FRENZY_DEFINITION, state, 'ghost', 0.9, 0.5)).toBe(state);
  });

  it('returns the same state reference for a disconnected player', () => {
    const state = stateWith([{ ...PLAYER, status: 'disconnected' }]);

    expect(applySteer(FRENZY_DEFINITION, state, PLAYER.id, 0.9, 0.5)).toBe(state);
  });

  it('returns the same state reference when the tap is on the player itself (zero direction)', () => {
    const state = stateWith([PLAYER]);

    expect(applySteer(FRENZY_DEFINITION, state, PLAYER.id, PLAYER.x, PLAYER.y)).toBe(state);
  });

  it('adds the impulse toward the tap, starting from rest', () => {
    const state = stateWith([PLAYER]);

    // Tap straight to the right of the resting player → pure +x impulse.
    const next = applySteer(FRENZY_DEFINITION, state, PLAYER.id, 0.9, 0.5);

    expect(next.players[0].vx).toBeCloseTo(FRENZY.steer.impulse, 5);
    expect(next.players[0].vy).toBeCloseTo(0, 5);
  });

  it('adds on top of the existing drift (additive, not a replacement)', () => {
    const drifting: Player = { ...PLAYER, vx: 0.02, vy: 0 };
    const state = stateWith([drifting]);

    const next = applySteer(FRENZY_DEFINITION, state, PLAYER.id, 0.9, 0.5);

    expect(next.players[0].vx).toBeCloseTo(0.02 + FRENZY.steer.impulse, 5);
  });

  it('caps the resulting speed at the stage maxSpeed', () => {
    const maxSpeed = TEST_BODY[PLAYER.stage].maxSpeed;
    const fast: Player = { ...PLAYER, vx: maxSpeed, vy: 0 };
    const state = stateWith([fast]);

    const next = applySteer(FRENZY_DEFINITION, state, PLAYER.id, 0.9, 0.5);
    const speed = Math.hypot(next.players[0].vx, next.players[0].vy);

    expect(speed).toBeCloseTo(maxSpeed, 5);
  });

  it('leaves other players untouched', () => {
    const other: Player = { ...PLAYER, id: 'p2', vx: 0.01, vy: -0.01 };
    const state = stateWith([PLAYER, other]);

    const next = applySteer(FRENZY_DEFINITION, state, PLAYER.id, 0.9, 0.5);

    expect(next.players[1]).toBe(other);
  });
});
