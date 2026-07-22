import { describe, expect, it } from 'vitest';

import type { Player, ServerState, SlimPlayer } from '@game/frenzy/types';

import { bodyForAppearance } from '../constants/pokemon-body';
import { applyServerMessage } from './apply-server-message';

const PLAYER: Player = {
  kind: 'human',
  id: 't1',
  name: 'Ash',
  appearance: 'caterpie',
  body: bodyForAppearance('caterpie'),
  stage: 1,
  hp: 100,
  mana: 0,
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

  it('appends a spawned item to the existing items', () => {
    const next = applyServerMessage(BOMB_STATE, {
      type: 'spawned',
      item: { id: 'r1', type: 'rock', x: 0.1, y: 0.2, vy: 0.1 },
    });

    expect(next?.items.map((item) => item.id)).toEqual(['b1', 'r1']);
  });

  it('bootstraps from an empty state when a spawned arrives before the first snapshot', () => {
    const next = applyServerMessage(null, {
      type: 'spawned',
      item: { id: 'r1', type: 'rock', x: 0.1, y: 0.2, vy: 0.1 },
    });

    expect(next).toEqual({
      players: [],
      items: [{ id: 'r1', type: 'rock', x: 0.1, y: 0.2, vy: 0.1 }],
      tick: 0,
    });
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

  it('merges slim players over the cached static half on slimSnapshot', () => {
    const slim: SlimPlayer = {
      id: 't1',
      stage: 2,
      hp: 250,
      mana: 0,
      x: 0.7,
      y: 0.2,
      vx: 0.01,
      vy: -0.02,
      status: 'alive',
      disconnectedAt: null,
      effects: [{ kind: 'shield', expiresAt: 9000 }],
      scores: { kills: 1 },
    };
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'slimSnapshot',
      state: { players: [slim], items: [], tick: 9 },
    });

    // Static half survives from the cached full player…
    expect(next?.players[0].name).toBe('Ash');
    expect(next?.players[0].appearance).toBe('caterpie');
    expect(next?.players[0].body).toEqual(PLAYER.body);
    expect(next?.players[0].kind).toBe('human');
    // …dynamic half comes from the slim entry.
    expect(next?.players[0].hp).toBe(250);
    expect(next?.players[0].stage).toBe(2);
    expect(next?.players[0].x).toBe(0.7);
    expect(next?.players[0].effects).toEqual([{ kind: 'shield', expiresAt: 9000 }]);
    expect(next?.tick).toBe(9);
  });

  it('treats slim membership as authoritative and drops unknown ids until the full snapshot', () => {
    const stranger: SlimPlayer = {
      id: 'stranger',
      stage: 1,
      hp: 100,
      mana: 0,
      x: 0.1,
      y: 0.2,
      vx: 0,
      vy: 0,
      status: 'alive',
      disconnectedAt: null,
      effects: [],
      scores: {},
    };
    // t1 is absent from the slim roster (left) and the only entry is an id we never saw a full snapshot for.
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'slimSnapshot',
      state: { players: [stranger], items: [], tick: 1 },
    });

    expect(next?.players).toHaveLength(0);
  });

  it('ignores a pre-bootstrap slimSnapshot (full snapshot arrives via onConnect)', () => {
    const next = applyServerMessage(null, {
      type: 'slimSnapshot',
      state: { players: [], items: [], tick: 1 },
    });

    expect(next).toBeNull();
  });

  it('re-anchors the steerer x/y and vx/vy on steered', () => {
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'steered',
      playerId: 't1',
      x: 0.52,
      y: 0.61,
      vx: 0.03,
      vy: -0.01,
    });

    expect(next?.players[0].x).toBe(0.52);
    expect(next?.players[0].y).toBe(0.61);
    expect(next?.players[0].vx).toBe(0.03);
    expect(next?.players[0].vy).toBe(-0.01);
  });

  it('ignores steered for an unknown player (joined between snapshots)', () => {
    const next = applyServerMessage(SNAPSHOT_STATE, {
      type: 'steered',
      playerId: 'stranger',
      x: 0.1,
      y: 0.2,
      vx: 0.03,
      vy: 0.04,
    });

    expect(next?.players).toEqual(SNAPSHOT_STATE.players);
    expect(
      applyServerMessage(null, { type: 'steered', playerId: 't1', x: 0, y: 0, vx: 0, vy: 0 }),
    ).toBeNull();
  });

  it('updates the NPC mana on npcAngered', () => {
    const npcState: ServerState = {
      players: [
        {
          ...PLAYER,
          kind: 'npc',
          npcKind: 'angryBomb',
          id: 'npc-1',
        },
      ],
      items: [],
      tick: 0,
    };
    const next = applyServerMessage(npcState, { type: 'npcAngered', npcId: 'npc-1', mana: 42 });

    expect(next?.players[0].mana).toBe(42);
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
      hits: [{ playerId: 't1', delta: -10 }],
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
