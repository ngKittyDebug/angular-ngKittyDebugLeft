import { describe, expect, it } from 'vitest';

import { applyClick } from '../engine/apply-click';
import type { Item, Player, ServerState } from '@game/frenzy/types';

const PLAYER: Player = {
  id: 'p1',
  name: 'Ash',
  line: 'caterpie',
  stage: 1,
  mass: 100,
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
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
    expect(next.players[0].mass).toBe(110);
    expect(events).toEqual([
      {
        type: 'eaten',
        itemId: 'i1',
        itemType: 'food',
        playerId: 'p1',
        newMass: 110,
        delta: 10,
        x: 0.5,
        y: 0.5,
      },
    ]);
  });

  it('clamps mass at zero and emits fainted', () => {
    const lowMass: Player = { ...PLAYER, mass: 10 };
    const state = stateWith([lowMass], [makeItem({ type: 'rotten' })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1');

    expect(next.players).toHaveLength(0);
    expect(events).toEqual([
      {
        type: 'eaten',
        itemId: 'i1',
        itemType: 'rotten',
        playerId: 'p1',
        newMass: 0,
        delta: -10,
        x: 0.5,
        y: 0.5,
      },
      { type: 'fainted', playerId: 'p1' },
    ]);
  });

  it('emits evolved when mass crosses stage threshold', () => {
    const heavy: Player = { ...PLAYER, mass: 195 };
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

  it('rock leaves mass unchanged but still removes item', () => {
    const state = stateWith([PLAYER], [makeItem({ type: 'rock' })]);

    const { state: next, events } = applyClick(state, PLAYER.id, 'i1');

    expect(next.items).toHaveLength(0);
    expect(next.players[0].mass).toBe(100);
    expect(events).toEqual([
      {
        type: 'eaten',
        itemId: 'i1',
        itemType: 'rock',
        playerId: 'p1',
        newMass: 100,
        delta: 0,
        x: 0.5,
        y: 0.5,
      },
    ]);
  });
});
