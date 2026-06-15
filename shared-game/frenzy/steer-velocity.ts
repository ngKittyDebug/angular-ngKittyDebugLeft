/** A 2D velocity vector (normalized units/sec). */
export interface Velocity {
  vx: number;
  vy: number;
}

/** Steering tuning: the per-tap impulse and the hard speed cap (normalized units/sec). */
export interface SteerTuning {
  impulse: number;
  maxSpeed: number;
}

/**
 * Pure steering velocity update shared by the authoritative server (apply-steer) and the client's
 * local-input prediction, so both compute the SAME post-steer velocity — keeping the eventual
 * reconciliation tiny. Adds an impulse toward (dx, dy) onto the current velocity, then caps the total
 * speed at maxSpeed. A zero direction (tap on self) returns the current velocity unchanged.
 */
export function steerVelocity(
  current: Velocity,
  dx: number,
  dy: number,
  tuning: SteerTuning,
): Velocity {
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { vx: current.vx, vy: current.vy };
  }

  let vx = current.vx + (dx / distance) * tuning.impulse;
  let vy = current.vy + (dy / distance) * tuning.impulse;
  const speed = Math.hypot(vx, vy);

  if (speed > tuning.maxSpeed) {
    vx = (vx / speed) * tuning.maxSpeed;
    vy = (vy / speed) * tuning.maxSpeed;
  }

  return { vx, vy };
}
