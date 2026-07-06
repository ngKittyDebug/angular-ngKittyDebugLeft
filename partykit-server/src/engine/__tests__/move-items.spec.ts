import { describe, expect, it } from 'vitest';

import { halfExtentNorm, restYFor } from '@game/engine/geometry';
import { FRENZY } from '@game/frenzy/config';
import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import type { Item } from '@game/frenzy/types';

import { moveItems } from '../core/tick/move-items';

const REST_RANGE = FRENZY_DEFINITION.spawn.restYRange;
const REST_MS = FRENZY_DEFINITION.spawn.restMs;
const ITEM_HALF_WIDTH = halfExtentNorm(
  FRENZY_DEFINITION.world.itemSizePx,
  FRENZY_DEFINITION.world.width,
);

function fallingFood(overrides: Partial<Item> = {}): Item {
  return { id: 'food-1', type: 'food', x: 0.5, y: 0.1, vy: FRENZY.fallSpeed.food, ...overrides };
}

describe('moveItems', () => {
  it('advances a plain faller down by vy and leaves it falling (no restMs) before the floor', () => {
    const item = fallingFood({ y: 0.1 });
    const [moved] = moveItems(FRENZY_DEFINITION, [item], 1);

    expect(moved.y).toBeCloseTo(0.1 + FRENZY.fallSpeed.food, 6);
    expect('restMs' in moved).toBe(false);
  });

  it('settles a plain faller on its hashed floor line with the resting timer', () => {
    const item = fallingFood({ y: 0.99, vy: 0.5 });
    const [moved] = moveItems(FRENZY_DEFINITION, [item], 1);

    expect(moved.y).toBe(restYFor('food-1', REST_RANGE));
    expect(moved.vy).toBe(0);
    expect(moved.restMs).toBe(REST_MS);
  });

  it('gives a settled explosive restMs 0 so the landing pass detonates it this tick', () => {
    const bomb: Item = { id: 'bomb-1', type: 'bomb', x: 0.5, y: 0.99, vx: 0, vy: 0.5 };
    const [moved] = moveItems(FRENZY_DEFINITION, [bomb], 1);

    expect(moved.y).toBe(restYFor('bomb-1', REST_RANGE));
    expect(moved.restMs).toBe(0);
  });

  it('counts a resting item down by the tick duration (still on the floor)', () => {
    const resting: Item = { ...fallingFood(), restMs: 5000, vy: 0 };
    const [moved] = moveItems(FRENZY_DEFINITION, [resting], 1);

    expect(moved.restMs).toBe(5000 - 1000);
    expect(moved.y).toBe(resting.y);
  });

  it('drifts a launched item horizontally and stops it (vx 0) at the size-aware wall', () => {
    const launched: Item = { ...fallingFood({ x: ITEM_HALF_WIDTH + 0.01 }), vx: -0.5, vy: 0 };
    const [moved] = moveItems(FRENZY_DEFINITION, [launched], 1);

    expect(moved.x).toBe(ITEM_HALF_WIDTH);
    expect(moved.vx).toBe(0);
  });
});
