import { describe, expect, it } from 'vitest';

import { markDisconnected } from '../engine/mark-disconnected';
import { restoreConnected } from '../engine/restore-connected';
import { TEST_BODY } from './test-body';
import type { Player, ServerState } from '@game/frenzy/types';

const ALIVE_PLAYER: Player = {
  id: 't1',
  name: 'Ash',
  appearance: 'caterpie',
  body: TEST_BODY,
  stage: 1,
  hp: 100,
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

const STATE: ServerState = { players: [ALIVE_PLAYER], items: [], tick: 0 };

describe('markDisconnected', () => {
  it('flips alive player to disconnected with timestamp', () => {
    const next = markDisconnected(STATE, 't1', 5000);

    expect(next.players[0].status).toBe('disconnected');
    expect(next.players[0].disconnectedAt).toBe(5000);
  });

  it('returns the same reference when target is not alive', () => {
    const disconnected: ServerState = {
      ...STATE,
      players: [{ ...ALIVE_PLAYER, status: 'disconnected', disconnectedAt: 1 }],
    };

    expect(markDisconnected(disconnected, 't1', 9999)).toBe(disconnected);
  });

  it('returns the same reference when sessionToken is unknown', () => {
    expect(markDisconnected(STATE, 'unknown', 5000)).toBe(STATE);
  });
});

describe('restoreConnected', () => {
  const DISCONNECTED_STATE: ServerState = {
    ...STATE,
    players: [{ ...ALIVE_PLAYER, status: 'disconnected', disconnectedAt: 5000 }],
  };

  it('flips disconnected player back to alive and clears timestamp', () => {
    const next = restoreConnected(DISCONNECTED_STATE, 't1');

    expect(next.players[0].status).toBe('alive');
    expect(next.players[0].disconnectedAt).toBeNull();
  });

  it('returns the same reference when target is already alive', () => {
    expect(restoreConnected(STATE, 't1')).toBe(STATE);
  });

  it('returns the same reference when sessionToken is unknown', () => {
    expect(restoreConnected(DISCONNECTED_STATE, 'unknown')).toBe(DISCONNECTED_STATE);
  });
});
