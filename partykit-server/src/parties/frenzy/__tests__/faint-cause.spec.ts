import { describe, expect, it } from 'vitest';

import type { Item } from '@game/frenzy/types';

import { itemFaintCause } from '../engine/faint-cause';

function makeItem(overrides: Partial<Item> = {}): Item {
  return { id: 'i1', type: 'rock', x: 0.5, y: 0.5, vy: 0.1, ...overrides };
}

describe('itemFaintCause', () => {
  it('attributes a naturally spawned item with no killer (killerId omitted from the wire)', () => {
    const cause = itemFaintCause(makeItem({ type: 'bomb' }));

    expect(cause).toEqual({ by: 'item', itemType: 'bomb' });
    expect(Object.hasOwn(cause, 'killerId')).toBe(false);
  });

  it('names the culprit when the item was emitted by a player (easter-egg/poop aura)', () => {
    const cause = itemFaintCause(makeItem({ type: 'bomb', ownerId: 'p2' }));

    expect(cause).toEqual({ by: 'item', itemType: 'bomb', killerId: 'p2' });
  });
});
