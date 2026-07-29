import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';

import { validateJoin } from '../validate-join';
import { TEST_BODY } from '../../../engine/__tests__/test-body';

describe('validateJoin', () => {
  it('accepts a well-formed name, appearance and body', () => {
    expect(validateJoin('Ash', 'magikarp', TEST_BODY)).toBeNull();
    expect(validateJoin('  Ash  ', 'magikarp', TEST_BODY)).toBeNull();
  });

  it('rejects a blank name', () => {
    expect(validateJoin('', 'magikarp', TEST_BODY)).toBe('invalidName');
    expect(validateJoin('   ', 'magikarp', TEST_BODY)).toBe('invalidName');
  });

  it('rejects an empty or oversized appearance', () => {
    expect(validateJoin('Ash', '', TEST_BODY)).toBe('invalidAppearance');
    expect(validateJoin('Ash', 'x'.repeat(33), TEST_BODY)).toBe('invalidAppearance');
  });

  it('rejects a prototype-chain builtin name as the appearance', () => {
    // Defence in depth: a builtin name would pass a length-only cap and, relayed to peers, break their render.
    expect(validateJoin('Ash', 'constructor', TEST_BODY)).toBe('invalidAppearance');
    expect(validateJoin('Ash', '__proto__', TEST_BODY)).toBe('invalidAppearance');
    expect(validateJoin('Ash', 'toString', TEST_BODY)).toBe('invalidAppearance');
    expect(validateJoin('Ash', 'hasOwnProperty', TEST_BODY)).toBe('invalidAppearance');
  });

  it('rejects a body with out-of-bounds dimensions or speeds', () => {
    const tooWide = { ...TEST_BODY, 1: { ...TEST_BODY[1], width: 9999 } };
    const negativeHeight = { ...TEST_BODY, 2: { ...TEST_BODY[2], height: -1 } };
    const speedOverCap = { ...TEST_BODY, 3: { ...TEST_BODY[3], speed: 1, maxSpeed: 1 } };
    const speedAboveMax = { ...TEST_BODY, 1: { ...TEST_BODY[1], speed: 0.06, maxSpeed: 0.05 } };

    expect(validateJoin('Ash', 'magikarp', tooWide)).toBe('invalidBody');
    expect(validateJoin('Ash', 'magikarp', negativeHeight)).toBe('invalidBody');
    expect(validateJoin('Ash', 'magikarp', speedOverCap)).toBe('invalidBody');
    expect(validateJoin('Ash', 'magikarp', speedAboveMax)).toBe('invalidBody');
  });

  it('rejects a body whose hp gates decrease across stages', () => {
    const descending = {
      1: { ...TEST_BODY[1], hp: 0 },
      2: { ...TEST_BODY[2], hp: 500 },
      3: { ...TEST_BODY[3], hp: 200 },
    };

    expect(validateJoin('Ash', 'magikarp', descending)).toBe('invalidBody');
  });

  it('rejects an hp gate above the hp ceiling', () => {
    const tooHigh = { ...TEST_BODY, 3: { ...TEST_BODY[3], hp: FRENZY.maxHp + 1 } };

    expect(validateJoin('Ash', 'magikarp', tooHigh)).toBe('invalidBody');
  });
});
