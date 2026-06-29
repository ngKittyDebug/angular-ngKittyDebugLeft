import { describe, expect, it } from 'vitest';

import { rescaleVelocity } from '@game/engine/geometry';

describe('rescaleVelocity', () => {
  it('returns a default +x heading for a parked (zero) velocity', () => {
    expect(rescaleVelocity(0, 0, 7)).toEqual({ vx: 7, vy: 0 });
  });

  it('scales a sub-target velocity UP to the target magnitude', () => {
    const { vx, vy } = rescaleVelocity(3, 4, 10);

    expect(vx).toBeCloseTo(6);
    expect(vy).toBeCloseTo(8);
    expect(Math.hypot(vx, vy)).toBeCloseTo(10);
  });

  it('scales an over-target velocity DOWN to the target magnitude', () => {
    const { vx, vy } = rescaleVelocity(6, 8, 5);

    expect(vx).toBeCloseTo(3);
    expect(vy).toBeCloseTo(4);
    expect(Math.hypot(vx, vy)).toBeCloseTo(5);
  });

  it('preserves direction (component ratio) and handles negative components', () => {
    const { vx, vy } = rescaleVelocity(-3, -4, 20);

    expect(vy / vx).toBeCloseTo(-4 / -3);
    expect(Math.sign(vx)).toBe(-1);
    expect(Math.sign(vy)).toBe(-1);
    expect(Math.hypot(vx, vy)).toBeCloseTo(20);
  });
});
