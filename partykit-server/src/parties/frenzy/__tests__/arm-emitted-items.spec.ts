import { describe, expect, it } from 'vitest';

import type { Item, Player } from '@game/frenzy/types';

import { armEmittedItems } from '../engine/tick/arm-emitted-items';
import { TEST_BODY } from './test-body';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'owner',
    name: 'O',
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
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i',
    type: 'bomb',
    x: 0.5,
    y: 0.5,
    vy: 0,
    ...overrides,
  };
}

describe('armEmittedItems', () => {
  it('leaves a non-emitted item (no ownerId) untouched', () => {
    const item = makeItem({ ownerId: undefined });
    const [result] = armEmittedItems([item], [makePlayer()]);

    expect(result.armed).toBeUndefined();
  });

  it('keeps a bomb un-armed while it still overlaps its owner body', () => {
    const owner = makePlayer({ x: 0.5, y: 0.5 });
    // Sitting right on the owner (just pooped) — body-overlap, so the owner stays protected.
    const item = makeItem({ ownerId: 'owner', x: 0.5, y: 0.5 });
    const [result] = armEmittedItems([item], [owner]);

    expect(result.armed).toBeUndefined();
  });

  it('arms a bomb once it has drifted off its owner body', () => {
    const owner = makePlayer({ x: 0.5, y: 0.5 });
    // Well clear of the owner's collision box — immunity lapses even though it is still within the blast radius.
    const item = makeItem({ ownerId: 'owner', x: 0.95, y: 0.5 });
    const [result] = armEmittedItems([item], [owner]);

    expect(result.armed).toBe(true);
  });

  it('stays armed even if the bomb drifts back inside the radius (sticky)', () => {
    const owner = makePlayer({ x: 0.5, y: 0.5 });
    const item = makeItem({ ownerId: 'owner', x: 0.5, y: 0.5, armed: true });
    const [result] = armEmittedItems([item], [owner]);

    expect(result.armed).toBe(true);
  });

  it('arms an emitted item whose owner has vanished — no one left to protect', () => {
    const item = makeItem({ ownerId: 'ghost', x: 0.5, y: 0.5 });
    const [result] = armEmittedItems([item], [makePlayer({ id: 'someone-else' })]);

    expect(result.armed).toBe(true);
  });

  it('arms an emitted item whose owner has fainted/disconnected', () => {
    const owner = makePlayer({ id: 'owner', status: 'disconnected' });
    const item = makeItem({ ownerId: 'owner', x: 0.5, y: 0.5 });
    const [result] = armEmittedItems([item], [owner]);

    expect(result.armed).toBe(true);
  });

  it('keeps a non-bomb emitted item un-armed while overlapping its owner, arms once clear', () => {
    const owner = makePlayer({ x: 0.5, y: 0.5 });
    const overlapping = makeItem({ type: 'rock', ownerId: 'owner', x: 0.5, y: 0.5 });
    const clear = makeItem({ type: 'rock', ownerId: 'owner', x: 0.95, y: 0.5 });
    const [overlapResult] = armEmittedItems([overlapping], [owner]);
    const [clearResult] = armEmittedItems([clear], [owner]);

    expect(overlapResult.armed).toBeUndefined();
    expect(clearResult.armed).toBe(true);
  });
});
