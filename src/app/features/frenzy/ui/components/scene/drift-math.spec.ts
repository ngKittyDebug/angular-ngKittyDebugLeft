import { describe, expect, it } from 'vitest';

import { decayedOffset, OFFSET_DECAY_TAU_MS, reflect } from './drift-math';

describe('reflect', () => {
  it('returns the start position at elapsed 0', () => {
    expect(reflect(0.3, 0.05, 0, 0.04, 0.96)).toBeCloseTo(0.3, 6);
  });

  it('stays within [min, max] across many bounces', () => {
    for (let t = 0; t < 100; t += 0.37) {
      const value = reflect(0.5, 0.07, t, 0.1, 0.9);

      expect(value).toBeGreaterThanOrEqual(0.1 - 1e-9);
      expect(value).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it('collapses to min for a degenerate span', () => {
    expect(reflect(0.5, 0.05, 3, 0.4, 0.4)).toBe(0.4);
  });
});

describe('decayedOffset', () => {
  it('returns the full offset at dt 0', () => {
    expect(decayedOffset(0.2, 0, OFFSET_DECAY_TAU_MS)).toBeCloseTo(0.2, 6);
  });

  it('is exactly 0 for a zero offset regardless of dt', () => {
    expect(decayedOffset(0, 12_345, OFFSET_DECAY_TAU_MS)).toBe(0);
  });

  it('decays toward 0 as time passes (≈1/e at one τ)', () => {
    const oneTau = decayedOffset(1, OFFSET_DECAY_TAU_MS, OFFSET_DECAY_TAU_MS);

    expect(oneTau).toBeCloseTo(Math.exp(-1), 6);
  });

  it('underflows to ~0 for a huge dt (backgrounded tab) without NaN', () => {
    const value = decayedOffset(0.5, 10_000_000, OFFSET_DECAY_TAU_MS);

    expect(Number.isNaN(value)).toBe(false);
    expect(value).toBeCloseTo(0, 6);
  });

  it('treats negative dt as 0 (clock skew guard)', () => {
    expect(decayedOffset(0.3, -500, OFFSET_DECAY_TAU_MS)).toBeCloseTo(0.3, 6);
  });

  it('rendered position (reflect + decayed offset) converges to the authoritative track', () => {
    const authoritative = reflect(0.5, 0.06, 1, 0.04, 0.96);
    const withFreshOffset = authoritative + decayedOffset(0.05, 0, OFFSET_DECAY_TAU_MS);
    const withAgedOffset = authoritative + decayedOffset(0.05, 10 * OFFSET_DECAY_TAU_MS, OFFSET_DECAY_TAU_MS);

    expect(Math.abs(withFreshOffset - authoritative)).toBeGreaterThan(0.01);
    expect(withAgedOffset).toBeCloseTo(authoritative, 4);
  });
});
