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

  it('createTransientId returns distinct ids', () => {
    expect(createTransientId()).not.toBe(createTransientId());
  });
});
