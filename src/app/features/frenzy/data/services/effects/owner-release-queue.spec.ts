import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLOAT_RELEASE_STAGGER_MS, OwnerReleaseQueue } from './owner-release-queue';

interface TestItem {
  id: string;
  ownerId: string;
  priority: number;
}

function item(id: string, ownerId: string, priority = 0): TestItem {
  return { id, ownerId, priority };
}

describe('OwnerReleaseQueue', () => {
  let released: TestItem[];
  let queue: OwnerReleaseQueue<TestItem>;

  beforeEach(() => {
    vi.useFakeTimers();
    released = [];
    queue = new OwnerReleaseQueue<TestItem>((entry) => released.push(entry));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('releases the first item of an owner immediately', () => {
    queue.enqueue(item('a', 'me'));

    expect(released).toEqual([item('a', 'me')]);
  });

  it('staggers the next item of the same owner', () => {
    queue.enqueue(item('a', 'me'));
    queue.enqueue(item('b', 'me'));

    expect(released).toHaveLength(1);

    vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS - 1);
    expect(released).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(released.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('releases a late high-priority item ahead of a pending lower one', () => {
    queue.enqueue(item('a', 'me', 10)); // releases at once
    queue.enqueue(item('low', 'me', 1));
    queue.enqueue(item('high', 'me', 100));

    vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS);
    expect(released.map((entry) => entry.id)).toEqual(['a', 'high']);

    vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS);
    expect(released.map((entry) => entry.id)).toEqual(['a', 'high', 'low']);
  });

  it('removePending stops a queued item from ever releasing', () => {
    queue.enqueue(item('a', 'me'));
    queue.enqueue(item('b', 'me'));

    expect(queue.removePending('b')).toBe(true);

    vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS * 2);
    expect(released.map((entry) => entry.id)).toEqual(['a']);
  });

  it('removePending returns false for an already-released item', () => {
    queue.enqueue(item('a', 'me'));

    expect(queue.removePending('a')).toBe(false);
  });

  it('notifyRemoved releases the pending replacement at once and cancels the stale stagger', () => {
    queue.enqueue(item('a', 'me')); // releases, starts the stagger
    queue.enqueue(item('b', 'me'));
    queue.enqueue(item('c', 'me'));

    queue.notifyRemoved('me'); // 'a' left the visible list → free the slot now
    expect(released.map((entry) => entry.id)).toEqual(['a', 'b']);

    // 'a's original timer was cancelled, so only 'b's fresh stagger drives 'c' — no early double-release.
    vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS);
    expect(released.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('releases different owners independently', () => {
    queue.enqueue(item('a', 'me'));
    queue.enqueue(item('b', 'other'));

    expect(released.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});
