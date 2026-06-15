import { describe, expect, it } from 'vitest';

import { steerVelocity } from '@game/frenzy/steer-velocity';

const TUNING = { impulse: 0.02, maxSpeed: 0.07 };

describe('steerVelocity', () => {
  it('returns the current velocity unchanged for a zero direction', () => {
    const current = { vx: 0.01, vy: -0.02 };

    expect(steerVelocity(current, 0, 0, TUNING)).toEqual(current);
  });

  it('adds the full impulse along the axis when starting from rest', () => {
    const next = steerVelocity({ vx: 0, vy: 0 }, 1, 0, TUNING);

    expect(next.vx).toBeCloseTo(TUNING.impulse, 5);
    expect(next.vy).toBeCloseTo(0, 5);
  });

  it('adds on top of the existing velocity (additive, not a replacement)', () => {
    const next = steerVelocity({ vx: 0.02, vy: 0 }, 1, 0, TUNING);

    expect(next.vx).toBeCloseTo(0.02 + TUNING.impulse, 5);
  });

  it('normalizes the direction so distance magnitude does not change the impulse', () => {
    const near = steerVelocity({ vx: 0, vy: 0 }, 0.001, 0, TUNING);
    const far = steerVelocity({ vx: 0, vy: 0 }, 1000, 0, TUNING);

    expect(near.vx).toBeCloseTo(far.vx, 5);
  });

  it('caps the resulting speed at maxSpeed', () => {
    const next = steerVelocity({ vx: TUNING.maxSpeed, vy: 0 }, 1, 0, TUNING);

    expect(Math.hypot(next.vx, next.vy)).toBeCloseTo(TUNING.maxSpeed, 5);
  });
});
