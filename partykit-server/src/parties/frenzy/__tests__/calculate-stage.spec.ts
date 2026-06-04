import { describe, expect, it } from 'vitest';

import { calculateStage } from '../engine/calculate-stage';

describe('calculateStage', () => {
  it('returns stage 1 below first threshold', () => {
    expect(calculateStage(0)).toBe(1);
    expect(calculateStage(100)).toBe(1);
    expect(calculateStage(199)).toBe(1);
  });

  it('returns stage 2 at and above stage2 threshold', () => {
    expect(calculateStage(200)).toBe(2);
    expect(calculateStage(350)).toBe(2);
    expect(calculateStage(499)).toBe(2);
  });

  it('returns stage 3 at and above stage3 threshold', () => {
    expect(calculateStage(500)).toBe(3);
    expect(calculateStage(1000)).toBe(3);
  });
});
