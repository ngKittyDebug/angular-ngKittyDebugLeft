import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';

import { accrueAnger, ANGER_CURVE_EXPONENT } from '../anger';

const CONFIG = FRENZY.npc.anger;

describe('accrueAnger', () => {
  it('yields ~0 gain for a lone poke (just a quip, no reddening)', () => {
    const { gain, timestamps } = accrueAnger([], 1000, CONFIG);

    expect(gain).toBe(0);
    expect(timestamps).toEqual([1000]);
  });

  it('ramps superlinearly as pokes pile up in the window', () => {
    // Two pokes in the window → base; three → base·2^exp; the per-step jump grows, proving superlinearity.
    const double = accrueAnger([1000], 1100, CONFIG).gain;
    const triple = accrueAnger([1000, 1100], 1200, CONFIG).gain;
    const quad = accrueAnger([1000, 1100, 1200], 1300, CONFIG).gain;

    expect(double).toBeCloseTo(CONFIG.base, 5);
    expect(triple).toBeCloseTo(CONFIG.base * 2 ** ANGER_CURVE_EXPONENT, 5);
    expect(triple - double).toBeGreaterThan(double); // step grows faster than linear
    expect(quad - triple).toBeGreaterThan(triple - double);
  });

  it('prunes timestamps older than the window so a slow drip never ramps', () => {
    const stale = 1000;
    const now = stale + CONFIG.windowMs + 1;
    const { gain, timestamps } = accrueAnger([stale], now, CONFIG);

    expect(timestamps).toEqual([now]); // the stale poke fell out of the window
    expect(gain).toBe(0); // so this counts as a fresh lone poke
  });
});
