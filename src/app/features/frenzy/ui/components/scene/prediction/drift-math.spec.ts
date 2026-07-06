import { describe, expect, it } from 'vitest';

import {
  clamp,
  decayedOffset,
  frameAwareTau,
  MAX_OFFSET_COLLAPSE_PER_FRAME,
  OFFSET_DECAY_TAU_MS,
  reflect,
  reflectDirection,
} from './drift-math';

describe('clamp', () => {
  it('passes through a value already inside the range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('pins a value below the range to the min', () => {
    expect(clamp(-3, 0, 1)).toBe(0);
  });

  it('pins a value above the range to the max', () => {
    expect(clamp(4, 0, 1)).toBe(1);
  });
});

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

describe('reflectDirection', () => {
  it('is 0 for a stationary drift', () => {
    expect(reflectDirection(0.5, 0, 1, 0.1, 0.9)).toBe(0);
  });

  it('is 0 for a degenerate span', () => {
    expect(reflectDirection(0.5, 0.05, 1, 0.4, 0.4)).toBe(0);
  });

  it('follows the velocity sign before the first wall bounce', () => {
    expect(reflectDirection(0.5, 0.07, 0.1, 0.1, 0.9)).toBe(1);
    expect(reflectDirection(0.5, -0.07, 0.1, 0.1, 0.9)).toBe(-1);
  });

  it('flips sign after a wall bounce', () => {
    // span 0.8, v 0.5 → reaches the max wall at t = (0.9-0.5)/0.5 = 0.8s, then reflects back leftward.
    expect(reflectDirection(0.5, 0.5, 0.5, 0.1, 0.9)).toBe(1);
    expect(reflectDirection(0.5, 0.5, 1.2, 0.1, 0.9)).toBe(-1);
  });

  it('agrees in sign with the derivative of reflect across a bounce', () => {
    const epsilon = 1e-4;

    for (const t of [0.2, 0.7, 0.9, 1.5, 2.3]) {
      const slope =
        reflect(0.5, 0.5, t + epsilon, 0.1, 0.9) - reflect(0.5, 0.5, t - epsilon, 0.1, 0.9);

      expect(reflectDirection(0.5, 0.5, t, 0.1, 0.9)).toBe(Math.sign(slope));
    }
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
    const withAgedOffset =
      authoritative + decayedOffset(0.05, 10 * OFFSET_DECAY_TAU_MS, OFFSET_DECAY_TAU_MS);

    expect(Math.abs(withFreshOffset - authoritative)).toBeGreaterThan(0.01);
    expect(withAgedOffset).toBeCloseTo(authoritative, 4);
  });
});

describe('frameAwareTau', () => {
  it('leaves the base τ untouched at 60fps (fast-client behaviour unchanged)', () => {
    // At ~16.7ms/frame the base τ=90 already keeps the per-frame collapse under the cap, so the floor is below it.
    expect(frameAwareTau(OFFSET_DECAY_TAU_MS, 1000 / 60)).toBe(OFFSET_DECAY_TAU_MS);
  });

  it('raises τ on a slow client so the glide spans more frames', () => {
    expect(frameAwareTau(OFFSET_DECAY_TAU_MS, 60)).toBeGreaterThan(OFFSET_DECAY_TAU_MS);
  });

  it('caps the single-frame offset collapse on a slow client', () => {
    const slowFrameMs = 60; // ~17fps
    const tau = frameAwareTau(OFFSET_DECAY_TAU_MS, slowFrameMs);
    // After one slow frame at the raised τ, at most MAX_OFFSET_COLLAPSE_PER_FRAME of the offset has decayed away.
    const collapsed = 1 - decayedOffset(1, slowFrameMs, tau);

    expect(collapsed).toBeLessThanOrEqual(MAX_OFFSET_COLLAPSE_PER_FRAME + 1e-9);
  });

  it('never drops below the base τ and ignores a non-positive interval', () => {
    expect(frameAwareTau(OFFSET_DECAY_TAU_MS, 0)).toBe(OFFSET_DECAY_TAU_MS);
    expect(frameAwareTau(OFFSET_DECAY_TAU_MS, -10)).toBe(OFFSET_DECAY_TAU_MS);
  });
});
