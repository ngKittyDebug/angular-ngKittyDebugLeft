import { describe, expect, it } from 'vitest';

import { breatheScaleAt, swayDegAt, tumbleDegAt } from './item-canvas-animation';

describe('tumbleDegAt', () => {
  it('hits the keyframe stops (0 → 150 → 200 → 360)', () => {
    expect(tumbleDegAt(0)).toBeCloseTo(0);
    expect(tumbleDegAt(0.3)).toBeCloseTo(150);
    expect(tumbleDegAt(0.65)).toBeCloseTo(200);
    expect(tumbleDegAt(0.9999)).toBeCloseTo(360, 1);
  });

  it('interpolates linearly within a segment', () => {
    expect(tumbleDegAt(0.15)).toBeCloseTo(75); // halfway through the 0→150° first segment
  });

  it('wraps by phase, so a whole cycle is one full turn', () => {
    expect(tumbleDegAt(1)).toBeCloseTo(0);
    expect(tumbleDegAt(2.3)).toBeCloseTo(tumbleDegAt(0.3));
  });
});

describe('breatheScaleAt', () => {
  it('pulses between 0.97 and 1.04 and back', () => {
    expect(breatheScaleAt(0)).toBeCloseTo(0.97);
    expect(breatheScaleAt(0.5)).toBeCloseTo(1.04);
    expect(breatheScaleAt(1)).toBeCloseTo(0.97);
  });

  it('stays within range mid-cycle', () => {
    const scale = breatheScaleAt(0.25);

    expect(scale).toBeGreaterThan(0.97);
    expect(scale).toBeLessThan(1.04);
  });
});

describe('swayDegAt', () => {
  it('rocks between -12° and +12° and back', () => {
    expect(swayDegAt(0)).toBeCloseTo(-12);
    expect(swayDegAt(0.5)).toBeCloseTo(12);
    expect(swayDegAt(1)).toBeCloseTo(-12);
  });
});
