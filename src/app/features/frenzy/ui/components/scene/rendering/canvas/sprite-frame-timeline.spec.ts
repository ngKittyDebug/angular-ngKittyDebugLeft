import { describe, expect, it } from 'vitest';

import { frameIndexAt } from './sprite-frame-timeline';

describe('frameIndexAt', () => {
  // Frame 0 shows [0,100), frame 1 [100,250), frame 2 [250,400); total loop = 400ms.
  const ends = [100, 250, 400];

  it('shows frame 0 from the start of its window', () => {
    expect(frameIndexAt(ends, 0)).toBe(0);
    expect(frameIndexAt(ends, 99)).toBe(0);
  });

  it('advances at each frame-end boundary', () => {
    expect(frameIndexAt(ends, 100)).toBe(1);
    expect(frameIndexAt(ends, 249)).toBe(1);
    expect(frameIndexAt(ends, 250)).toBe(2);
    expect(frameIndexAt(ends, 399)).toBe(2);
  });

  it('wraps a whole cycle back to the first frame', () => {
    expect(frameIndexAt(ends, 400)).toBe(0); // 400 % 400 = 0
    expect(frameIndexAt(ends, 500)).toBe(1); // 500 % 400 = 100 → frame 1
    expect(frameIndexAt(ends, 400 * 3 + 250)).toBe(2); // wraps to 250 → frame 2
  });

  it('maps negative time into the cycle (Euclidean wrap)', () => {
    expect(frameIndexAt(ends, -1)).toBe(2); // -1 → 399 → frame 2
    expect(frameIndexAt(ends, -400)).toBe(0); // -400 → 0 → frame 0
    expect(frameIndexAt(ends, -401)).toBe(2); // -401 → 399 → frame 2
  });

  it('holds frame 0 for a single-frame timeline at any time', () => {
    expect(frameIndexAt([100], 0)).toBe(0);
    expect(frameIndexAt([100], 250)).toBe(0);
    expect(frameIndexAt([100], -5)).toBe(0);
  });

  it('returns frame 0 for a degenerate (empty / zero-total) timeline', () => {
    expect(frameIndexAt([], 12)).toBe(0);
    expect(frameIndexAt([0], 12)).toBe(0);
  });
});
