import { describe, expect, it } from 'vitest';

import { plantSwayDegAt } from './kelp-canvas-animation';

describe('plantSwayDegAt', () => {
  it('sits at +rotDeg at the start of the cycle (the 0% keyframe)', () => {
    expect(plantSwayDegAt(0, -4)).toBeCloseTo(-4);
  });

  it('reaches -rotDeg at the half cycle (the 100% keyframe under alternate)', () => {
    expect(plantSwayDegAt(0.5, -4)).toBeCloseTo(4);
  });

  it('returns to +rotDeg at the end of the cycle', () => {
    expect(plantSwayDegAt(1, -4)).toBeCloseTo(-4);
  });

  it('passes through the midpoint (0°) at a quarter cycle, eased', () => {
    expect(plantSwayDegAt(0.25, -4)).toBeCloseTo(0);
  });

  it('wraps an unbounded phase (period 1)', () => {
    expect(plantSwayDegAt(3.5, -4)).toBeCloseTo(plantSwayDegAt(0.5, -4));
  });
});
