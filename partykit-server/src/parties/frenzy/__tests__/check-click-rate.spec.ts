import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { checkClickRate } from '../engine/check-click-rate';

const WINDOW = FRENZY.clickRateLimitWindowMs;
const MAX = FRENZY.clickRateLimitMax;

describe('checkClickRate', () => {
  it('allows the first click on an empty history', () => {
    const result = checkClickRate([], 1000);

    expect(result.allowed).toBe(true);
    expect(result.timestamps).toEqual([1000]);
  });

  it('drops timestamps that fall outside the window', () => {
    const stale = [100, 200, 300];
    const now = 300 + WINDOW + 1;
    const result = checkClickRate(stale, now);

    expect(result.allowed).toBe(true);
    expect(result.timestamps).toEqual([now]);
  });

  it('blocks once the recent count reaches the maximum', () => {
    const burst = Array.from({ length: MAX }, (_, i) => 1000 + i);
    const result = checkClickRate(burst, 1000 + MAX);

    expect(result.allowed).toBe(false);
    expect(result.timestamps).toHaveLength(MAX);
  });

  it('allows again once older timestamps slide out of the window', () => {
    const burst = Array.from({ length: MAX }, (_, i) => 1000 + i);
    const after = 1000 + WINDOW + 1;
    const result = checkClickRate(burst, after);

    expect(result.allowed).toBe(true);
    expect(result.timestamps).toContain(after);
  });
});
