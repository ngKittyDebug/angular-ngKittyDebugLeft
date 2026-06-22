import { describe, expect, it } from 'vitest';

import { groupByOwner, sortByDepth } from './scene-view-models';

describe('groupByOwner', () => {
  it('buckets items under their ownerId', () => {
    const grouped = groupByOwner([
      { ownerId: 'a', n: 1 },
      { ownerId: 'b', n: 2 },
      { ownerId: 'a', n: 3 },
    ]);

    expect([...grouped.keys()]).toEqual(['a', 'b']);
    expect(grouped.get('a')).toEqual([
      { ownerId: 'a', n: 1 },
      { ownerId: 'a', n: 3 },
    ]);
    expect(grouped.get('b')).toEqual([{ ownerId: 'b', n: 2 }]);
  });

  it('preserves source order within a bucket', () => {
    const grouped = groupByOwner([
      { ownerId: 'a', n: 1 },
      { ownerId: 'a', n: 2 },
      { ownerId: 'a', n: 3 },
    ]);

    expect(grouped.get('a')?.map((item) => item.n)).toEqual([1, 2, 3]);
  });

  it('never creates an empty bucket (a present key always maps to a non-empty array)', () => {
    const grouped = groupByOwner([{ ownerId: 'a', n: 1 }]);

    expect(grouped.has('b')).toBe(false);

    for (const bucket of grouped.values()) {
      expect(bucket.length).toBeGreaterThan(0);
    }
  });

  it('returns an empty map for no items', () => {
    expect(groupByOwner([]).size).toBe(0);
  });
});

describe('sortByDepth', () => {
  it('orders by ascending y so lower-on-screen items paint later', () => {
    const sorted = sortByDepth([{ y: 0.8 }, { y: 0.2 }, { y: 0.5 }]);

    expect(sorted.map((item) => item.y)).toEqual([0.2, 0.5, 0.8]);
  });

  it('does not mutate the input array', () => {
    const input = [{ y: 0.8 }, { y: 0.2 }];

    sortByDepth(input);

    expect(input.map((item) => item.y)).toEqual([0.8, 0.2]);
  });
});
