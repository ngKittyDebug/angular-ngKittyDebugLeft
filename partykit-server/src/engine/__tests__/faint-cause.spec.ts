import { describe, expect, it } from 'vitest';

import type { Item } from '@game/frenzy/types';

import { bumpFaintCause, itemFaintCause } from '../core/faint-cause';

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

  it('credits the last shover of a bomb (lastNudgedBy) so the blast names them', () => {
    const cause = itemFaintCause(makeItem({ type: 'bomb', lastNudgedBy: 'shover' }));

    expect(cause).toEqual({ by: 'item', itemType: 'bomb', killerId: 'shover' });
  });

  it('prefers the shover over the emitter when a bomb was both laid and shoved', () => {
    const cause = itemFaintCause(
      makeItem({ type: 'bomb', ownerId: 'layer', lastNudgedBy: 'shover' }),
    );

    expect(cause).toEqual({ by: 'item', itemType: 'bomb', killerId: 'shover' });
  });
});

describe('bumpFaintCause', () => {
  it('attributes a fatal collision to the rammer (always named)', () => {
    expect(bumpFaintCause('p2')).toEqual({ by: 'bump', killerId: 'p2' });
  });
});
