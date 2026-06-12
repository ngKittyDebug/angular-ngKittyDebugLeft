import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

import { findCollisionTarget } from '../engine/tick/collision-target';
import { TEST_BODY } from './test-body';

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
  scores: {},
};

function itemAt(x: number, y: number, overrides: Partial<Item> = {}): Item {
  return { id: 'i1', type: 'food', x, y, vy: 0, ...overrides };
}

// AABB half-reach in normalized units for a stage's box: itemHalf + bodyHalf * generosity, per axis. The item
// enters at its true half (no assist); only the body half is scaled by generosity.
function reachNormX(stage: 1 | 2 | 3): number {
  const halfPx =
    FRENZY.physicalSizePx.item / 2 +
    (TEST_BODY[stage].width / 2) * FRENZY.collision.catchGenerosity;

  return halfPx / FRENZY.world.width;
}

function reachNormY(stage: 1 | 2 | 3): number {
  const halfPx =
    FRENZY.physicalSizePx.item / 2 +
    (TEST_BODY[stage].height / 2) * FRENZY.collision.catchGenerosity;

  return halfPx / FRENZY.world.height;
}

describe('findCollisionTarget (AABB)', () => {
  it('returns the player when the item overlaps its box', () => {
    expect(findCollisionTarget(itemAt(0.5, 0.5), [PLAYER])?.id).toBe('p1');
  });

  it('hits just inside the box edge and misses just outside on each axis', () => {
    const reachX = reachNormX(1);
    const reachY = reachNormY(1);

    expect(findCollisionTarget(itemAt(0.5 + reachX * 0.99, 0.5), [PLAYER])).toBe(PLAYER);
    expect(findCollisionTarget(itemAt(0.5 + reachX * 1.01, 0.5), [PLAYER])).toBeUndefined();
    expect(findCollisionTarget(itemAt(0.5, 0.5 + reachY * 0.99), [PLAYER])).toBe(PLAYER);
    expect(findCollisionTarget(itemAt(0.5, 0.5 + reachY * 1.01), [PLAYER])).toBeUndefined();
  });

  it('treats the box as a rectangle: wide-but-not-tall overlap can hit while the other axis misses', () => {
    // A point past the (smaller) Y reach but within X reach must NOT collide — proves it is not a circle/square.
    const outsideY = itemAt(0.5, 0.5 + reachNormY(1) * 1.2);

    expect(findCollisionTarget(outsideY, [PLAYER])).toBeUndefined();
  });

  it('a bigger stage reaches further (size-aware)', () => {
    // A point inside stage-3's reach but outside stage-1's: only the evolved body catches it.
    const justBeyondStage1 = itemAt(0.5 + (reachNormX(1) + reachNormX(3)) / 2, 0.5);
    const small: Player = { ...PLAYER, stage: 1 };
    const big: Player = { ...PLAYER, stage: 3 };

    expect(findCollisionTarget(justBeyondStage1, [small])).toBeUndefined();
    expect(findCollisionTarget(justBeyondStage1, [big])?.id).toBe('p1');
  });

  it('picks the closest centre among several overlapping players', () => {
    const near: Player = { ...PLAYER, id: 'near', x: 0.5 + reachNormX(1) * 0.2 };
    const far: Player = { ...PLAYER, id: 'far', x: 0.5 + reachNormX(1) * 0.6 };

    expect(findCollisionTarget(itemAt(0.5, 0.5), [far, near])?.id).toBe('near');
  });

  it('skips dead players and the item owner', () => {
    const dead: Player = { ...PLAYER, id: 'dead', status: 'disconnected' };
    const owner: Player = { ...PLAYER, id: 'owner' };

    expect(findCollisionTarget(itemAt(0.5, 0.5), [dead])).toBeUndefined();
    expect(findCollisionTarget(itemAt(0.5, 0.5, { ownerId: 'owner' }), [owner])).toBeUndefined();
  });
});
