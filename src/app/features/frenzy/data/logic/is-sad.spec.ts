import { describe, expect, it } from 'vitest';

import { isSad } from './is-sad';

describe('isSad', () => {
  it('marks stage 1 sad below 100 (50% of stage2 threshold)', () => {
    expect(isSad(99, 1)).toBe(true);
    expect(isSad(50, 1)).toBe(true);
    expect(isSad(100, 1)).toBe(false);
    expect(isSad(150, 1)).toBe(false);
  });

  it('marks stage 2 sad below 250 (50% of stage3 threshold)', () => {
    expect(isSad(249, 2)).toBe(true);
    expect(isSad(200, 2)).toBe(true);
    expect(isSad(250, 2)).toBe(false);
    expect(isSad(400, 2)).toBe(false);
  });

  it('marks stage 3 sad below 600 (own band above the stage3 hp floor)', () => {
    expect(isSad(500, 3)).toBe(true);
    expect(isSad(599, 3)).toBe(true);
    expect(isSad(600, 3)).toBe(false);
    expect(isSad(800, 3)).toBe(false);
  });
});
