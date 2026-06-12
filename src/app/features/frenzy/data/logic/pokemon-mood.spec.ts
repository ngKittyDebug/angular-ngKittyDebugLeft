import { describe, expect, it } from 'vitest';

import { getMood } from './pokemon-mood';

describe('getMood', () => {
  it('is starving at or below the low-hp warning threshold, regardless of stage', () => {
    expect(getMood(6, 1)).toBe('starving');
    expect(getMood(1, 1)).toBe('starving');
    expect(getMood(6, 3)).toBe('starving');
  });

  it('maps stage 1 across the mood bands', () => {
    expect(getMood(7, 1)).toBe('hungry');
    expect(getMood(149, 1)).toBe('hungry');
    expect(getMood(150, 1)).toBe('content');
    expect(getMood(349, 1)).toBe('content');
    expect(getMood(350, 1)).toBe('happy');
  });

  it('maps stage 2 across the mood bands', () => {
    expect(getMood(649, 2)).toBe('hungry');
    expect(getMood(650, 2)).toBe('content');
    expect(getMood(849, 2)).toBe('content');
    expect(getMood(850, 2)).toBe('happy');
  });

  it('lets a barely-evolved stage 3 still be hungry (fixes the old never-sad gap)', () => {
    expect(getMood(1000, 3)).toBe('hungry');
    expect(getMood(1099, 3)).toBe('hungry');
    expect(getMood(1100, 3)).toBe('content');
    expect(getMood(1299, 3)).toBe('content');
    expect(getMood(1300, 3)).toBe('happy');
  });
});
