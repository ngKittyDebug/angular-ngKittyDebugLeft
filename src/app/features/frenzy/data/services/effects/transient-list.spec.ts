import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTransientId, TransientList } from './transient-list';

describe('TransientList', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds an item and auto-removes it once its ttl elapses', () => {
    vi.useFakeTimers();
    const list = new TransientList<{ id: string }>();

    list.add({ id: 'a' }, 1000);
    expect(list.items()).toEqual([{ id: 'a' }]);

    vi.advanceTimersByTime(999);
    expect(list.items()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(list.items()).toEqual([]);
  });

  it('removes a specific item by id, leaving the rest', () => {
    const list = new TransientList<{ id: string }>();

    list.add({ id: 'a' }, 10_000);
    list.add({ id: 'b' }, 10_000);
    list.remove('a');

    expect(list.items()).toEqual([{ id: 'b' }]);
  });

  it('caps the list to the given size, dropping the oldest item', () => {
    const list = new TransientList<{ id: string }>();

    list.add({ id: 'a' }, 10_000, 3);
    list.add({ id: 'b' }, 10_000, 3);
    list.add({ id: 'c' }, 10_000, 3);
    list.add({ id: 'd' }, 10_000, 3);

    expect(list.items().map((item) => item.id)).toEqual(['b', 'c', 'd']);
  });

  it('does not cap when no cap is given', () => {
    const list = new TransientList<{ id: string }>();

    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      list.add({ id }, 10_000);
    }

    expect(list.items()).toHaveLength(5);
  });

  it('createTransientId returns distinct ids', () => {
    expect(createTransientId()).not.toBe(createTransientId());
  });
});
