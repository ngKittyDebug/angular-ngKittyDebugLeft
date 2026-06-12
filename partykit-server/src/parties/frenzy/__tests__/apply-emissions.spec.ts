import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { Player, PlayerEffect, ServerState } from '@game/frenzy/types';

import { applyEmissions } from '../engine/apply-emissions';

function player(id: string, effects: PlayerEffect[] = []): Player {
  return {
    id,
    name: id,
    appearance: 'caterpie',
    stage: 1,
    hp: 100,
    x: 0.4,
    y: 0.6,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects,
  };
}

const LAYING: PlayerEffect[] = [{ kind: 'laying', expiresAt: 10_000 }];

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('applyEmissions', () => {
  // rng < emitChancePerTick → emit; the same rng then drives pickItemType (0 → first weighted type: food).
  const emit = (): number => 0;
  const skip = (): number => 0.5;

  it('a laying player sprays an item from its lower-rear, launched backward and tagged with ownerId', () => {
    const layer = player('p1', LAYING);
    const { state: next, spawned } = applyEmissions(stateWith([layer]), emit, () => 'egg-1');

    expect(spawned).toEqual([
      {
        id: 'egg-1',
        type: 'food',
        // Idle layer (vx 0) faces right → item spawns behind (left of) and below it, launched left.
        x: 0.4 - FRENZY.easterEgg.emitBack,
        y: 0.6 + FRENZY.easterEgg.emitDown,
        vx: -FRENZY.easterEgg.emitBackSpeed,
        vy: FRENZY.fallSpeed.food,
        ownerId: 'p1',
      },
    ]);
    expect(next.items).toEqual(spawned);
  });

  it('launches the item opposite the heading: a left-moving layer sprays to the right', () => {
    const layer = { ...player('p1', LAYING), vx: -0.05 };
    const { spawned } = applyEmissions(stateWith([layer]), emit, () => 'egg-2');

    expect(spawned[0].vx).toBeCloseTo(FRENZY.easterEgg.emitBackSpeed, 5);
    expect(spawned[0].x).toBeCloseTo(0.4 + FRENZY.easterEgg.emitBack, 5);
  });

  it('does not emit when the per-tick roll misses the chance', () => {
    const layer = player('p1', LAYING);
    const { state: next, spawned } = applyEmissions(stateWith([layer]), skip, () => 'egg-1');

    expect(spawned).toEqual([]);
    expect(next.items).toEqual([]);
  });

  it('does not emit for a player without the laying aura', () => {
    const { spawned } = applyEmissions(stateWith([player('p1')]), emit, () => 'egg-1');

    expect(spawned).toEqual([]);
  });

  it('does not emit for a disconnected laying player', () => {
    const offline = { ...player('p1', LAYING), status: 'disconnected' as const };
    const { spawned } = applyEmissions(stateWith([offline]), emit, () => 'egg-1');

    expect(spawned).toEqual([]);
  });

  it('returns the same state reference when nothing is emitted', () => {
    const state = stateWith([player('p1', LAYING)]);
    const result = applyEmissions(state, skip, () => 'egg-1');

    expect(result.state).toBe(state);
  });
});
