import { describe, expect, it } from 'vitest';

import { getMood } from './pokemon-mood';

describe('getMood', () => {
  it('is starving at or below the low-mass warning threshold, regardless of stage', () => {
    expect(getMood(6, 1)).toBe('starving');
    expect(getMood(1, 1)).toBe('starving');
    expect(getMood(6, 3)).toBe('starving');
  });

  it('maps stage 1 across the mood bands', () => {
    expect(getMood(7, 1)).toBe('hungry');
    expect(getMood(99, 1)).toBe('hungry');
    expect(getMood(100, 1)).toBe('content');
    expect(getMood(159, 1)).toBe('content');
    expect(getMood(160, 1)).toBe('happy');
  });

  it('maps stage 2 across the mood bands', () => {
    expect(getMood(249, 2)).toBe('hungry');
    expect(getMood(250, 2)).toBe('content');
    expect(getMood(419, 2)).toBe('content');
    expect(getMood(420, 2)).toBe('happy');
  });

  it('lets a barely-evolved stage 3 still be hungry (fixes the old never-sad gap)', () => {
    expect(getMood(500, 3)).toBe('hungry');
    expect(getMood(599, 3)).toBe('hungry');
    expect(getMood(600, 3)).toBe('content');
    expect(getMood(799, 3)).toBe('content');
    expect(getMood(800, 3)).toBe('happy');
  });
});
