// Shared keyframe helpers for the canvas decor ports (kelp sway, mote drift, bubble rise), so the canvas backend
// matches the DOM CSS animations exactly. Pure; unit-tested through the porters that consume them.

// Fractional part (0..1) of a phase, so callers can pass an unbounded `now / cycleMs`.
export function fractional(phase: number): number {
  return phase - Math.floor(phase);
}

// Smoothstep ease-in-out (≈ CSS default ease-in-out) for `u` in 0..1.
export function easeInOut(u: number): number {
  return u * u * (3 - 2 * u);
}

// Linear interpolation from `from` to `to` at `t` in 0..1.
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
