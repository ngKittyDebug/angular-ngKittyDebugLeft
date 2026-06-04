import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OwnedFloat } from '../../models/floating-message';
import { FloatingMessagesStore } from './floating-messages.store';

function ownedFloat(ownerId: string, durationMs = 1000): Omit<OwnedFloat, 'lane'> {
  return {
    id: `${ownerId}-${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    tone: 'positive',
    textKey: 'floatingText.food.0',
    durationMs,
  };
}

function lanesFor(store: FloatingMessagesStore, ownerId: string): number[] {
  return store
    .ownedMessages()
    .filter((float) => float.ownerId === ownerId)
    .map((float) => float.lane);
}

describe('FloatingMessagesStore lane assignment', () => {
  let store: FloatingMessagesStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new FloatingMessagesStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives co-existing floats of one owner distinct lanes', () => {
    store.pushOwned(ownedFloat('me'));
    store.pushOwned(ownedFloat('me'));
    store.pushOwned(ownedFloat('me'));

    expect(lanesFor(store, 'me')).toEqual([0, 1, 2]);
  });

  it('tracks lanes per owner independently', () => {
    store.pushOwned(ownedFloat('me'));
    store.pushOwned(ownedFloat('other'));

    expect(lanesFor(store, 'me')).toEqual([0]);
    expect(lanesFor(store, 'other')).toEqual([0]);
  });

  it('reuses the lane freed by an expired float', () => {
    store.pushOwned(ownedFloat('me', 1000));
    store.pushOwned(ownedFloat('me', 5000));

    // First float (lane 0) expires; the second keeps lane 1.
    vi.advanceTimersByTime(1000);
    expect(lanesFor(store, 'me')).toEqual([1]);

    // A fresh float slots back into the now-free lane 0 instead of climbing to lane 2.
    store.pushOwned(ownedFloat('me'));
    expect([...lanesFor(store, 'me')].sort()).toEqual([0, 1]);
  });

  it('wraps lanes once all slots are filled', () => {
    for (let i = 0; i < 5; i++) {
      store.pushOwned(ownedFloat('me', 5000));
    }

    // Four distinct lanes, then the fifth wraps back to 0.
    expect(lanesFor(store, 'me')).toEqual([0, 1, 2, 3, 0]);
  });
});
