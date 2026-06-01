import { describe, expect, it } from 'vitest';

import type { Player, ServerState } from '@game/frenzy/types';

import { applyServerMessage } from './apply-server-message';

const PLAYER: Player = {
  id: 't1',
  name: 'Ash',
  line: 'caterpie',
  stage: 1,
  mass: 100,
  x: 0.5,
  y: 0.6,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
};

const SNAPSHOT_STATE: ServerState = { players: [PLAYER], items: [], tick: 0 };

describe('applyServerMessage', () => {
  it('replaces state on snapshot', () => {
    const next = applyServerMessage(null, { type: 'snapshot', state: SNAPSHOT_STATE });

    expect(next).toEqual(SNAPSHOT_STATE);
  });

  it('updates player mass on eaten', () => {
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'eaten',
      itemId: 'i1',
      itemType: 'food',
      playerId: 't1',
      newMass: 150,
      delta: 50,
      x: 0.5,
      y: 0.5,
    });

    expect(next?.players[0].mass).toBe(150);
  });

  it('removes player on fainted', () => {
    const next = applyServerMessage(SNAPSHOT_STATE, { type: 'fainted', playerId: 't1' });

    expect(next?.players).toHaveLength(0);
  });

  it('updates player stage on evolved', () => {
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'evolved',
      playerId: 't1',
      newStage: 2,
    });

    expect(next?.players[0].stage).toBe(2);
  });

  it('returns previous on rejoined and roomFull (no-op in reducer)', () => {
    expect(applyServerMessage(SNAPSHOT_STATE, { type: 'rejoined', playerId: 't1' })).toBe(
      SNAPSHOT_STATE,
    );
    expect(applyServerMessage(SNAPSHOT_STATE, { type: 'roomFull' })).toBe(SNAPSHOT_STATE);
  });
});
