import { describe, expect, it } from 'vitest';

import { buildKelpField, kelpFieldCount, MIN_PLANTS } from './kelp-field';

describe('kelpFieldCount', () => {
  it('floors at MIN_PLANTS for a narrow width', () => {
    expect(kelpFieldCount(10)).toBe(MIN_PLANTS);
  });

  it('scales to roughly one blade per spacing on a wide world', () => {
    // 2400px world ÷ 11px spacing ≈ 218 — the scene's full-width forest.
    expect(kelpFieldCount(2400)).toBe(218);
  });
});

describe('buildKelpField', () => {
  it('builds exactly `count` blades, indexed 0..count-1 in order', () => {
    const field = buildKelpField(5);

    expect(field).toHaveLength(5);
    expect(field.map((blade) => blade.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('is deterministic — same count yields an identical field', () => {
    expect(buildKelpField(20)).toEqual(buildKelpField(20));
  });

  it('cycles the three blade shapes by index', () => {
    expect(buildKelpField(6).map((blade) => blade.shape)).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it('computes the first blade from the documented per-index formulas', () => {
    const [first] = buildKelpField(3);

    expect(first).toEqual({
      index: 0,
      shape: 0,
      left: ((1 - 0.5) / 3) * 100 + (((1 * 37) % 7) - 3),
      height: 180,
      width: 49,
      root: 6 + (1 - 0.47) * 11,
      rotation: -4,
      zIndex: 3,
      brightness: 0.55 + 0.47 * 0.5,
      durationSeconds: 5.5,
      delaySeconds: -0.6,
    });
  });
});
