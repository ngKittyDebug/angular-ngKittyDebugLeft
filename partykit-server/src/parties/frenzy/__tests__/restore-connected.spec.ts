import { describe, expect, it } from 'vitest';

import type { HumanPlayer, Player, ServerState } from '@game/frenzy/types';

import { restoreConnected } from '../restore-connected';
import { TEST_BODY } from '../../../engine/__tests__/test-body';

function player(overrides: Partial<HumanPlayer> = {}): Player {
  return {
    kind: 'human',
    id: 't1',
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
    status: 'disconnected',
    disconnectedAt: 5000,
    joinedAt: 0,
    effects: [],
    scores: {},
    ...overrides,
  };
}

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('restoreConnected', () => {
  it('flips a disconnected player back to alive and clears the disconnect timestamp', () => {
    const state = stateWith([player({ status: 'disconnected', disconnectedAt: 5000 })]);

    const next = restoreConnected(state, 't1');

    expect(next.players[0].status).toBe('alive');
    expect(next.players[0].disconnectedAt).toBeNull();
  });

  it('preserves the restored player position and score state across the flip', () => {
    const state = stateWith([
      player({
        status: 'disconnected',
        disconnectedAt: 5000,
        hp: 42,
        x: 0.2,
        scores: { kills: 3 },
      }),
    ]);

    const next = restoreConnected(state, 't1');

    expect(next.players[0]).toMatchObject({ hp: 42, x: 0.2, scores: { kills: 3 } });
  });

  it('returns the same reference when the target is already alive (no work)', () => {
    const state = stateWith([player({ status: 'alive', disconnectedAt: null })]);

    expect(restoreConnected(state, 't1')).toBe(state);
  });

  it('returns the same reference when no player matches the id', () => {
    const state = stateWith([player({ status: 'disconnected', disconnectedAt: 5000 })]);

    expect(restoreConnected(state, 'unknown')).toBe(state);
  });

  it('restores only the named player, leaving other disconnected peers offline', () => {
    const state = stateWith([
      player({ id: 't1', status: 'disconnected', disconnectedAt: 5000 }),
      player({ id: 't2', status: 'disconnected', disconnectedAt: 7000 }),
    ]);

    const next = restoreConnected(state, 't1');

    expect(next.players[0].status).toBe('alive');
    expect(next.players[1].status).toBe('disconnected');
    expect(next.players[1].disconnectedAt).toBe(7000);
  });
});
