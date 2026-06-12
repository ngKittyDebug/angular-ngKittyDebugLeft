import { describe, expect, it } from 'vitest';

import type { Player, ServerState } from '@game/frenzy/types';

import { bodyForAppearance } from '../../ui/constants/pokemon-registry';
import { applyServerMessage } from './apply-server-message';

const PLAYER: Player = {
  id: 't1',
  name: 'Ash',
  appearance: 'caterpie',
  body: bodyForAppearance('caterpie'),
  stage: 1,
  hp: 100,
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

const SNAPSHOT_STATE: ServerState = { players: [PLAYER], items: [], tick: 0 };
const BOMB_STATE: ServerState = {
  players: [PLAYER],
  items: [{ id: 'b1', type: 'bomb', x: 0.3, y: 0.4, vy: 0.08 }],
  tick: 0,
};

describe('applyServerMessage', () => {
  it('replaces state on snapshot', () => {
    const next = applyServerMessage(null, { type: 'snapshot', state: SNAPSHOT_STATE });

    expect(next).toEqual(SNAPSHOT_STATE);
  });

  it('updates player hp on eaten', () => {
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'eaten',
      itemId: 'i1',
      itemType: 'food',
      playerId: 't1',
      newHp: 150,
      delta: 50,
      x: 0.5,
      y: 0.5,
      via: 'click',
    });

    expect(next?.players[0].hp).toBe(150);
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

  it('updates the bomb x/y and vx/vy on itemNudged (shove)', () => {
    const next = applyServerMessage(BOMB_STATE, {
      type: 'itemNudged',
      itemId: 'b1',
      x: 0.45,
      y: 0.42,
      vx: -0.04,
      vy: 0.02,
    });

    expect(next?.items[0].x).toBe(0.45);
    expect(next?.items[0].y).toBe(0.42);
    expect(next?.items[0].vx).toBe(-0.04);
    expect(next?.items[0].vy).toBe(0.02);
  });

  it('drops the bomb item on detonated', () => {
    const next = applyServerMessage(BOMB_STATE, {
      type: 'detonated',
      itemId: 'b1',
      x: 0.45,
      y: 1,
      radius: 0.18,
      playerIds: ['t1'],
    });

    expect(next?.items).toHaveLength(0);
  });

  it('adds the effect and drops the consumed item on effectGranted', () => {
    const state: ServerState = {
      ...SNAPSHOT_STATE,
      items: [{ id: 'v1', type: 'vitamin', x: 0.3, y: 0.4, vy: 0.15 }],
    };
    const next = applyServerMessage(state, {
      type: 'effectGranted',
      playerId: 't1',
      effect: { kind: 'shield', expiresAt: 9000 },
      itemId: 'v1',
      x: 0.3,
      y: 0.4,
      via: 'click',
    });

    expect(next?.items).toHaveLength(0);
    expect(next?.players[0].effects).toEqual([{ kind: 'shield', expiresAt: 9000 }]);
  });

  it('refreshes an existing effect of the same kind on effectGranted', () => {
    const shielded: Player = { ...PLAYER, effects: [{ kind: 'shield', expiresAt: 5000 }] };
    const state: ServerState = { players: [shielded], items: [], tick: 0 };
    const next = applyServerMessage(state, {
      type: 'effectGranted',
      playerId: 't1',
      effect: { kind: 'shield', expiresAt: 9000 },
      itemId: 'gone',
      x: 0.5,
      y: 0.5,
      via: 'click',
    });

    expect(next?.players[0].effects).toEqual([{ kind: 'shield', expiresAt: 9000 }]);
  });

  it('returns previous on rejoined and roomFull (no-op in reducer)', () => {
    expect(applyServerMessage(SNAPSHOT_STATE, { type: 'rejoined', playerId: 't1' })).toBe(
      SNAPSHOT_STATE,
    );
    expect(applyServerMessage(SNAPSHOT_STATE, { type: 'roomFull' })).toBe(SNAPSHOT_STATE);
  });

  it('returns previous unchanged on ping (liveness heartbeat carries no state)', () => {
    expect(applyServerMessage(SNAPSHOT_STATE, { type: 'ping' })).toBe(SNAPSHOT_STATE);
    expect(applyServerMessage(null, { type: 'ping' })).toBe(null);
  });
});
