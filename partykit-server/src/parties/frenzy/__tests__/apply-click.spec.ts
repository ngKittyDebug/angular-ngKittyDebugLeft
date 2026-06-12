import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';

import { applyClick } from '../engine/apply-click';
import { TEST_BODY } from './test-body';
import type { Item, Player, ServerState } from '@game/frenzy/types';

const PLAYER: Player = {
  id: 'p1',
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
};

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'food',
    x: 0.5,
    y: 0.5,
    vy: 0.3,
    ...overrides,
  };
}

function stateWith(players: Player[], items: Item[]): ServerState {
  return { players, items, tick: 0 };
}

describe('applyClick', () => {
  it('returns state unchanged when item is missing', () => {
    const state = stateWith([PLAYER], []);

    const { state: next, events } = applyClick(state, PLAYER.id, 'gone');

    expect(next).toBe(state);
    expect(events).toEqual([]);
  });

  it('returns state unchanged when player is unknown', () => {
    const state = stateWith([PLAYER], [makeItem()]);

    const { state: next, events } = applyClick(state, 'ghost', 'i1');

    expect(next).toBe(state);
    expect(events).toEqual([]);
  });

  it('applies food delta and emits eaten event', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'food' })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1');

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(110);
    expect(events).toEqual([
      {
        type: 'eaten',
        itemId: 'i1',
        itemType: 'food',
        playerId: 'p1',
        newHp: 110,
        delta: 10,
        x: 0.5,
        y: 0.5,
        via: 'click',
      },
    ]);
  });

  it('clamps hp at zero and emits fainted', () => {
    const lowHp: Player = { ...PLAYER, hp: 10 };
    const state = stateWith([lowHp], [makeItem({ type: 'rotten' })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1');

    expect(next.players).toHaveLength(0);
    expect(events).toEqual([
      {
        type: 'eaten',
        itemId: 'i1',
        itemType: 'rotten',
        playerId: 'p1',
        newHp: 0,
        delta: -10,
        x: 0.5,
        y: 0.5,
        via: 'click',
      },
      { type: 'fainted', playerId: 'p1', cause: { by: 'item', itemType: 'rotten' } },
    ]);
  });

  it('emits evolved when hp crosses stage threshold', () => {
    const heavy: Player = { ...PLAYER, hp: 195 };
    const state = stateWith([heavy], [makeItem({ type: 'food' })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1');

    expect(next.players[0].stage).toBe(2);
    expect(events).toContainEqual({ type: 'evolved', playerId: 'p1', newStage: 2 });
  });

  it('does not emit evolved when stage stays the same', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'food' })]);

    const { events } = applyClick(state, PLAYER.id, 'i1');

    expect(events.some((event) => event.type === 'evolved')).toBe(false);
  });

  it('batting a bomb slides it by the supplied displacement without eating it or changing hp', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'bomb', x: 0.5 })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1', -0.1);

    expect(next.items).toHaveLength(1);
    expect(next.items[0].x).toBeCloseTo(0.4, 5);
    expect(next.players[0].hp).toBe(100);
    expect(events).toEqual([{ type: 'itemNudged', itemId: 'i1', x: expect.closeTo(0.4, 5) }]);
  });

  it('grabbing a vitamin heals hp and grants wellFed, removes the item, emits effectGranted', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'vitamin' })]);

    const { state: next, events } = applyClick(
      state,
      PLAYER.id,
      'i1',
      undefined,
      Math.random,
      1000,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(100 + FRENZY.vitamin.hp);
    expect(next.players[0].effects).toEqual([
      { kind: 'wellFed', expiresAt: 1000 + FRENZY.vitamin.decayPauseMs },
    ]);
    expect(events).toEqual([
      {
        type: 'effectGranted',
        playerId: 'p1',
        effect: { kind: 'wellFed', expiresAt: 1000 + FRENZY.vitamin.decayPauseMs },
        itemId: 'i1',
        x: 0.5,
        y: 0.5,
        via: 'click',
      },
    ]);
  });

  it('grabbing a shield wards the clicker (effectGranted, no hp change), removes the item', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'shield' })]);

    const { state: next, events } = applyClick(
      state,
      PLAYER.id,
      'i1',
      undefined,
      Math.random,
      1000,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(100);
    expect(next.players[0].effects).toEqual([
      { kind: 'shield', expiresAt: 1000 + FRENZY.shield.shieldMs },
    ]);
    expect(events).toEqual([
      {
        type: 'effectGranted',
        playerId: 'p1',
        effect: { kind: 'shield', expiresAt: 1000 + FRENZY.shield.shieldMs },
        itemId: 'i1',
        x: 0.5,
        y: 0.5,
        via: 'click',
      },
    ]);
  });

  it('rock leaves hp unchanged but still removes item', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'rock' })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1');

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(100);
    expect(events).toEqual([
      {
        type: 'eaten',
        itemId: 'i1',
        itemType: 'rock',
        playerId: 'p1',
        newHp: 100,
        delta: 0,
        x: 0.5,
        y: 0.5,
        via: 'click',
      },
    ]);
  });
});
