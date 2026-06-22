import { describe, expect, it } from 'vitest';

import { shadowBreatheAt, shadowCoreFor } from './player-shadow';

describe('shadowCoreFor', () => {
  it('returns null for no active effect (neutral shadow)', () => {
    expect(shadowCoreFor(null)).toBeNull();
  });

  it('maps each effect class to its shared tint core', () => {
    expect(shadowCoreFor('scene__shadow--shield')).toBe('rgba(90, 190, 255, 0.9)');
    expect(shadowCoreFor('scene__shadow--wellFed')).toBe('rgba(150, 230, 150, 0.85)');
    expect(shadowCoreFor('scene__shadow--laying')).toBe('rgba(210, 160, 255, 0.85)');
    expect(shadowCoreFor('scene__shadow--pooping')).toBe('rgba(120, 85, 50, 0.9)');
    expect(shadowCoreFor('scene__shadow--cactus')).toBe('rgba(120, 200, 90, 0.9)');
  });

  it('returns null for an unknown class (no tint, neutral fallback)', () => {
    expect(shadowCoreFor('scene__shadow--mystery')).toBeNull();
  });
});

describe('shadowBreatheAt', () => {
  it('sits at the keyframe troughs at cycle start/end', () => {
    expect(shadowBreatheAt(0).opacity).toBeCloseTo(0.78);
    expect(shadowBreatheAt(0).scale).toBeCloseTo(0.97);
    expect(shadowBreatheAt(2600).opacity).toBeCloseTo(0.78); // full cycle wraps back
  });

  it('peaks at the half-cycle', () => {
    expect(shadowBreatheAt(1300).opacity).toBeCloseTo(1);
    expect(shadowBreatheAt(1300).scale).toBeCloseTo(1.06);
  });

  it('stays within the keyframe envelope across the cycle', () => {
    for (let now = 0; now <= 2600; now += 130) {
      const breathe = shadowBreatheAt(now);

      expect(breathe.opacity).toBeGreaterThanOrEqual(0.78 - 1e-9);
      expect(breathe.opacity).toBeLessThanOrEqual(1 + 1e-9);
      expect(breathe.scale).toBeGreaterThanOrEqual(0.97 - 1e-9);
      expect(breathe.scale).toBeLessThanOrEqual(1.06 + 1e-9);
    }
  });
});
