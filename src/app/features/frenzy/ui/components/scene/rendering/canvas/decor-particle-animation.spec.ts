import { describe, expect, it } from 'vitest';

import { bubbleRiseAt, moteDriftAt } from './decor-particle-animation';

describe('moteDriftAt', () => {
  it('sits at the base position with the floor opacity at phase 0', () => {
    const state = moteDriftAt(0, 18, -22, 0.8);

    // Offsets are zero at rest (a signed-zero IEEE artifact of `dy * 0`, irrelevant to the canvas).
    expect(state.offsetX).toBeCloseTo(0, 10);
    expect(state.offsetY).toBeCloseTo(0, 10);
    expect(state.opacity).toBe(0.15);
  });

  it('peaks opacity at half drift mid-forward-leg (phase 0.25)', () => {
    // Forward 50%: translate is eased to half, opacity is at its keyframe peak.
    expect(moteDriftAt(0.25, 18, -22, 0.8)).toEqual({ offsetX: 9, offsetY: -11, opacity: 0.8 });
  });

  it('reaches the full drift offset (and the low end opacity) at the far extreme (phase 0.5)', () => {
    expect(moteDriftAt(0.5, 18, -22, 0.8)).toEqual({ offsetX: 18, offsetY: -22, opacity: 0.25 });
  });

  it('wraps an unbounded phase to its period', () => {
    expect(moteDriftAt(2.25, 18, -22, 0.8)).toEqual(moteDriftAt(0.25, 18, -22, 0.8));
  });
});

describe('bubbleRiseAt', () => {
  it('starts below the floor, shrunk and invisible at phase 0', () => {
    expect(bubbleRiseAt(0, 12)).toEqual({
      offsetX: 0,
      bottomFraction: -0.08,
      scale: 0.6,
      opacity: 0,
    });
  });

  it('is midway up, full size, swung to the far drift at phase 0.5', () => {
    const state = bubbleRiseAt(0.5, 12);

    expect(state.bottomFraction).toBeCloseTo(0.5, 10);
    expect(state.offsetX).toBe(-12);
    expect(state.scale).toBe(1);
    expect(state.opacity).toBe(0.9);
  });

  it('fades in over the first 8% of the rise', () => {
    expect(bubbleRiseAt(0.04, 12).opacity).toBeCloseTo(0.45, 10);
  });

  it('fades out over the final 8% of the rise', () => {
    expect(bubbleRiseAt(0.96, 12).opacity).toBeCloseTo(0.45, 10);
  });

  it('wraps to the bottom at the cycle end (phase 1 == phase 0)', () => {
    expect(bubbleRiseAt(1, 12)).toEqual(bubbleRiseAt(0, 12));
  });
});
