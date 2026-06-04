import { describe, expect, it } from 'vitest';

import type { Player, ServerState } from '@game/frenzy/types';

import { applyMassDeltas } from '../engine/apply-mass-deltas';

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Ash',
    appearance: 'caterpie',
    stage: 1,
    mass: 100,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    ...overrides,
  };
}

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('applyMassDeltas', () => {
  it('returns the same state reference for an empty delta list', () => {
    const state = stateWith([player()]);

    const result = applyMassDeltas(state, []);

    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('adds mass without an event when no stage threshold is crossed', () => {
    const state = stateWith([player({ mass: 100 })]);

    const result = applyMassDeltas(state, [{ playerId: 'p1', amount: 10 }]);

    expect(result.state.players[0].mass).toBe(110);
    expect(result.state.players[0].stage).toBe(1);
    expect(result.events).toEqual([]);
  });

  it('emits evolved when a delta crosses a stage threshold', () => {
    const state = stateWith([player({ mass: 195, stage: 1 })]);

    const result = applyMassDeltas(state, [{ playerId: 'p1', amount: 10 }]);

    expect(result.state.players[0].stage).toBe(2);
    expect(result.events).toEqual([{ type: 'evolved', playerId: 'p1', newStage: 2 }]);
  });

  it('clamps at zero, removes the player and emits fainted', () => {
    const state = stateWith([player({ mass: 10 })]);

    const result = applyMassDeltas(state, [{ playerId: 'p1', amount: -15 }]);

    expect(result.state.players).toHaveLength(0);
    expect(result.events).toEqual([{ type: 'fainted', playerId: 'p1' }]);
  });

  it('leaves untargeted players untouched', () => {
    const state = stateWith([player({ id: 'p1' }), player({ id: 'p2', mass: 300, stage: 2 })]);

    const result = applyMassDeltas(state, [{ playerId: 'p1', amount: 10 }]);

    expect(result.state.players[1]).toBe(state.players[1]);
  });

  it('applies collateral effects to several players at once', () => {
    const state = stateWith([
      player({ id: 'p1', mass: 195, stage: 1 }),
      player({ id: 'p2', mass: 5, stage: 1 }),
    ]);

    const result = applyMassDeltas(state, [
      { playerId: 'p1', amount: 10 },
      { playerId: 'p2', amount: -20 },
    ]);

    expect(result.state.players).toHaveLength(1);
    expect(result.state.players[0].id).toBe('p1');
    expect(result.state.players[0].stage).toBe(2);
    expect(result.events).toEqual([
      { type: 'evolved', playerId: 'p1', newStage: 2 },
      { type: 'fainted', playerId: 'p2' },
    ]);
  });

  it('accumulates multiple deltas aimed at the same player', () => {
    const state = stateWith([player({ mass: 100 })]);

    const result = applyMassDeltas(state, [
      { playerId: 'p1', amount: 30 },
      { playerId: 'p1', amount: -10 },
    ]);

    expect(result.state.players[0].mass).toBe(120);
  });

  it('nullifies a net-negative delta for a shielded player (no damage, no faint)', () => {
    const state = stateWith([
      player({ mass: 10, effects: [{ kind: 'shield', expiresAt: 10_000 }] }),
    ]);

    const result = applyMassDeltas(state, [{ playerId: 'p1', amount: -15 }]);

    expect(result.state.players).toHaveLength(1);
    expect(result.state.players[0].mass).toBe(10);
    expect(result.events).toEqual([]);
  });

  it('still applies positive deltas to a shielded player', () => {
    const state = stateWith([
      player({ mass: 100, effects: [{ kind: 'shield', expiresAt: 10_000 }] }),
    ]);

    const result = applyMassDeltas(state, [{ playerId: 'p1', amount: 10 }]);

    expect(result.state.players[0].mass).toBe(110);
  });
});
