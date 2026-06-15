import { describe, expect, it } from 'vitest';

import { isSad } from './is-sad';

describe('isSad', () => {
  it('marks stage 1 sad below its hungry band (150)', () => {
    expect(isSad(149, 1)).toBe(true);
    expect(isSad(50, 1)).toBe(true);
    expect(isSad(150, 1)).toBe(false);
    expect(isSad(350, 1)).toBe(false);
  });

  it('marks stage 2 sad below its hungry band (650)', () => {
    expect(isSad(649, 2)).toBe(true);
    expect(isSad(500, 2)).toBe(true);
    expect(isSad(650, 2)).toBe(false);
    expect(isSad(850, 2)).toBe(false);
  });

  it('marks stage 3 sad below its own band above the stage-3 hp floor (1100)', () => {
    expect(isSad(1000, 3)).toBe(true);
    expect(isSad(1099, 3)).toBe(true);
    expect(isSad(1100, 3)).toBe(false);
    expect(isSad(1300, 3)).toBe(false);
  });
});
