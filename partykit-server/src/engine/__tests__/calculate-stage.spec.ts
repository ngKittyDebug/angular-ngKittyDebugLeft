import { describe, expect, it } from 'vitest';

import { calculateStage } from '../core/calculate-stage';
import { TEST_BODY } from './test-body';

describe('calculateStage', () => {
  it('returns stage 1 below the stage-2 gate', () => {
    expect(calculateStage(0, TEST_BODY)).toBe(1);
    expect(calculateStage(100, TEST_BODY)).toBe(1);
    expect(calculateStage(TEST_BODY[2].hp - 1, TEST_BODY)).toBe(1);
  });

  it('returns stage 2 at and above the stage-2 gate', () => {
    expect(calculateStage(TEST_BODY[2].hp, TEST_BODY)).toBe(2);
    expect(calculateStage(350, TEST_BODY)).toBe(2);
    expect(calculateStage(TEST_BODY[3].hp - 1, TEST_BODY)).toBe(2);
  });

  it('returns stage 3 at and above the stage-3 gate', () => {
    expect(calculateStage(TEST_BODY[3].hp, TEST_BODY)).toBe(3);
    expect(calculateStage(1000, TEST_BODY)).toBe(3);
  });

  it('reads each player gate, not a global threshold', () => {
    const slowEvolver = {
      1: { ...TEST_BODY[1] },
      2: { ...TEST_BODY[2], hp: 400 },
      3: { ...TEST_BODY[3], hp: 900 },
    };

    expect(calculateStage(399, slowEvolver)).toBe(1);
    expect(calculateStage(400, slowEvolver)).toBe(2);
    expect(calculateStage(899, slowEvolver)).toBe(2);
    expect(calculateStage(900, slowEvolver)).toBe(3);
  });
});
