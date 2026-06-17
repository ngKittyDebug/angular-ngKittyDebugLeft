import { describe, expect, it } from 'vitest';

import { FRENZY_DEFINITION } from '@game/frenzy/definition';

import { FRENZY } from '@game/frenzy/config';
import type { Player, PlayerEffect, ServerState } from '@game/frenzy/types';

import { applyEmissions as applyEmissionsPass, buildEmitters } from '../core/apply-emissions';
import { TEST_BODY } from './test-body';

const EMITTERS = buildEmitters(FRENZY_DEFINITION);

function player(id: string, effects: PlayerEffect[] = []): Player {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'caterpie',
    body: TEST_BODY,
    stage: 1,
    hp: 100,
    mana: 0,
    x: 0.4,
    y: 0.6,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects,
    scores: {},
  };
}

const LAYING: PlayerEffect[] = [{ kind: 'laying', expiresAt: 10_000 }];
const POOPING: PlayerEffect[] = [{ kind: 'pooping', expiresAt: 10_000 }];

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

// A schedule whose single holder is already due at now = 0, so the emit path runs this tick.
function dueAt(id: string, at = 0): Map<string, number> {
  return new Map([[id, at]]);
}

// Feeds rng calls in order, repeating the last value once exhausted. The gate is now timing-based, so rng drives only
// pickItemType (first call) then the angle jitter (second call) — 0.5 → zero rotation, for an exact launch vector.
function sequenceRng(values: number[]): () => number {
  let index = 0;

  return () => values[Math.min(index++, values.length - 1)];
}

describe('applyEmissions', () => {
  it('a due laying player sprays an item from its lower-rear, launched backward and tagged with ownerId', () => {
    const layer = player('p1', LAYING);
    // rng: [pickItemType → food, angle jitter = 0.5 → zero rotation] so the exact launch vector holds.
    const {
      state: next,
      spawned,
      schedule,
    } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([layer]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0.5]),
      () => 'egg-1',
    );

    expect(spawned).toEqual([
      {
        id: 'egg-1',
        type: 'food',
        // Idle layer (vx 0) faces right → item spawns past the body's rear-left edge and below it, launched left.
        x: 0.4 - (TEST_BODY[1].width / 2 / FRENZY.world.width + FRENZY.easterEgg.emitBack),
        y: 0.6 + TEST_BODY[1].height / 2 / FRENZY.world.height + FRENZY.easterEgg.emitDown,
        vx: -FRENZY.easterEgg.emitBackSpeed,
        vy: FRENZY.fallSpeed.food,
        ownerId: 'p1',
      },
    ]);
    expect(next.items).toEqual(spawned);
    // Re-armed on the exact grid: due (0) + interval, not now + interval.
    expect(schedule.get('p1')).toBe(FRENZY.easterEgg.emitIntervalMs);
  });

  it('launches the item opposite the heading: a left-moving layer sprays to the right', () => {
    const layer = { ...player('p1', LAYING), vx: -0.05 };
    const { spawned } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([layer]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0.5]),
      () => 'egg-2',
    );

    expect(spawned[0].vx).toBeCloseTo(FRENZY.easterEgg.emitBackSpeed, 5);
    expect(spawned[0].x).toBeCloseTo(
      0.4 + TEST_BODY[1].width / 2 / FRENZY.world.width + FRENZY.easterEgg.emitBack,
      5,
    );
  });

  it('a laying player only ever sprays the all-positive egg pool — never a nasty, bomb nor aura item', () => {
    // Always due; the first rng sweeps pickItemType across the whole eggEmitWeights pool.
    const allowed = new Set([
      'food',
      'crumb',
      'mushroom',
      'vitamin',
      'shield',
      'rareCandy',
      'goldenBerry',
    ]);
    const seen = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const pick = i / 100;
      const { spawned } = applyEmissionsPass(
        FRENZY_DEFINITION,
        EMITTERS,
        stateWith([player('p1', LAYING)]),
        0,
        dueAt('p1'),
        sequenceRng([pick, 0.5]),
        () => 'egg-x',
      );

      for (const item of spawned) {
        expect(allowed.has(item.type)).toBe(true);
        seen.add(item.type);
      }
    }

    // The sweep actually reaches every band — otherwise the assertion above is vacuous.
    expect(seen).toEqual(allowed);
  });

  it('does not emit before the interval elapses, carrying the timer forward and keeping the same state ref', () => {
    const state = stateWith([player('p1', LAYING)]);
    // Timer due far in the future, now well before it → not due.
    const {
      state: next,
      spawned,
      schedule,
    } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      state,
      0,
      dueAt('p1', 5000),
      sequenceRng([0, 0.5]),
      () => 'egg-1',
    );

    expect(spawned).toEqual([]);
    expect(next).toBe(state); // nothing emitted → same reference
    expect(schedule.get('p1')).toBe(5000); // timer carried over unchanged
  });

  it('arms the timer on the first tick under the aura and emits nothing yet', () => {
    // Empty schedule → first time seen: arm at now + interval, no item this tick.
    const { spawned, schedule } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([player('p1', LAYING)]),
      1000,
      new Map(),
      sequenceRng([0, 0.5]),
      () => 'egg-1',
    );

    expect(spawned).toEqual([]);
    expect(schedule.get('p1')).toBe(1000 + FRENZY.easterEgg.emitIntervalMs);
  });

  it('does not emit nor schedule a player without the laying aura', () => {
    const { spawned, schedule } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([player('p1')]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0.5]),
      () => 'egg-1',
    );

    expect(spawned).toEqual([]);
    expect(schedule.has('p1')).toBe(false); // dropped from the map → auto-clean
  });

  it('does not emit for a disconnected laying player', () => {
    const offline = { ...player('p1', LAYING), status: 'disconnected' as const };
    const { spawned, schedule } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([offline]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0.5]),
      () => 'egg-1',
    );

    expect(spawned).toEqual([]);
    expect(schedule.has('p1')).toBe(false);
  });

  it('a due pooping player sprays only from the nasty pool (rng 0 → rock), using the poop launch config', () => {
    const pooper = player('p1', POOPING);
    const { spawned, schedule } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([pooper]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0.5]),
      () => 'poop-1',
    );

    expect(spawned).toEqual([
      {
        id: 'poop-1',
        type: 'rock',
        x: 0.4 - (TEST_BODY[1].width / 2 / FRENZY.world.width + FRENZY.poop.emitBack),
        y: 0.6 + TEST_BODY[1].height / 2 / FRENZY.world.height + FRENZY.poop.emitDown,
        vx: -FRENZY.poop.emitBackSpeed,
        vy: FRENZY.fallSpeed.rock,
        ownerId: 'p1',
      },
    ]);
    expect(schedule.get('p1')).toBe(FRENZY.poop.emitIntervalMs);
  });

  it('a pooping player sprays the nasty pool (rock/brick/bomb/cactus) — never poop itself — across the whole pool', () => {
    // Always due; the first rng sweeps pickItemType across the whole poopEmitWeights pool.
    const allowed = new Set(['rock', 'brick', 'bomb', 'cactus']);
    const seen = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const pick = i / 100;
      const { spawned } = applyEmissionsPass(
        FRENZY_DEFINITION,
        EMITTERS,
        stateWith([player('p1', POOPING)]),
        0,
        dueAt('p1'),
        sequenceRng([pick, 0.5]),
        () => 'poop-x',
      );

      for (const item of spawned) {
        expect(allowed.has(item.type)).toBe(true);
        seen.add(item.type);
      }
    }

    // The sweep actually reaches every band — otherwise the assertion above is vacuous.
    expect(seen).toEqual(allowed);
  });

  it('a player holding both auras emits via laying (first match wins → food, not the poop pool)', () => {
    const both = player('p1', [...LAYING, ...POOPING]);
    const { spawned } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([both]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0.5]),
      () => 'both-1',
    );

    expect(spawned[0].type).toBe('food');
    expect(spawned[0].vx).toBeCloseTo(-FRENZY.easterEgg.emitBackSpeed, 5);
  });

  it('jitters the launch angle so successive emissions fan out instead of lining up (speed preserved)', () => {
    const speedOf = (s: { vx?: number; vy: number }): number => Math.hypot(s.vx ?? 0, s.vy);
    const base = Math.hypot(FRENZY.easterEgg.emitBackSpeed, FRENZY.fallSpeed.food);

    // Same item type (food), two opposite jitter rolls → two different launch directions, one speed.
    const { spawned: ccw } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([player('p1', LAYING)]),
      0,
      dueAt('p1'),
      sequenceRng([0, 0]),
      () => 'e',
    );
    const { spawned: cw } = applyEmissionsPass(
      FRENZY_DEFINITION,
      EMITTERS,
      stateWith([player('p1', LAYING)]),
      0,
      dueAt('p1'),
      sequenceRng([0, 1]),
      () => 'e',
    );

    expect(ccw[0].vx).not.toBeCloseTo(cw[0].vx ?? 0, 4); // fanned apart, not a single line
    expect(speedOf(ccw[0])).toBeCloseTo(base, 6); // rotation preserves the launch speed
    expect(speedOf(cw[0])).toBeCloseTo(base, 6);
    expect(ccw[0].vy).toBeGreaterThan(0); // still launched downward, never flipped upward
    expect(cw[0].vy).toBeGreaterThan(0);
  });
});
