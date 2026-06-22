// JS port of the item tumble/breathe/sway CSS keyframes (scene-item.component.scss), so the canvas renderer animates
// items identically to the DOM renderer. Pure + unit-tested; the canvas service feeds a phase (an unbounded
// `now / cycleMs`, wrapped here) and applies the returned angle/scale via ctx.rotate/scale. The eased keyframes
// (breathe, sway) use smoothstep as the ease-in-out — visually indistinguishable from CSS's default cubic-bezier on
// these small oscillations, and cheap to evaluate per frame.

// Constant breathe cycle (ms) — matches SceneItemComponent.breatheMs.
export const BREATHE_MS = 2600;

const BREATHE_MIN_SCALE = 0.97;
const BREATHE_MAX_SCALE = 1.04;
const SWAY_MAX_DEG = 12;

// Fractional part (0..1) of a phase, so callers can pass an unbounded `now / cycleMs`.
function fractional(phase: number): number {
  return phase - Math.floor(phase);
}

// Smoothstep ease-in-out (≈ CSS default ease-in-out) for `u` in 0..1.
function easeInOut(u: number): number {
  return u * u * (3 - 2 * u);
}

// Eased there-and-back over a cycle: 0 at phase 0 and 1, 1 at phase 0.5 — the shape both the breathe and sway
// keyframes use (stops at 0% / 50% / 100% with ease-in-out between).
function pingPong(phase: number): number {
  const t = fractional(phase);

  return t < 0.5 ? easeInOut(t / 0.5) : easeInOut((1 - t) / 0.5);
}

// Tumble rotation (deg) at a phase: the uneven keyframe — 0→150° over the first 30%, 150→200° to 65%, 200→360° to
// the end (linear within each segment), so the item lingers then whips through the last third. The caller negates
// the result for a reversed spinner.
export function tumbleDegAt(phase: number): number {
  const t = fractional(phase);

  if (t < 0.3) {
    return (t / 0.3) * 150;
  }

  if (t < 0.65) {
    return 150 + ((t - 0.3) / 0.35) * 50;
  }

  return 200 + ((t - 0.65) / 0.35) * 160;
}

// Breathe scale at a phase: a soft size pulse between 0.97 and 1.04 and back, ease-in-out.
export function breatheScaleAt(phase: number): number {
  return BREATHE_MIN_SCALE + (BREATHE_MAX_SCALE - BREATHE_MIN_SCALE) * pingPong(phase);
}

// Shield sway (deg) at a phase: rocks between -12° and +12° and back, ease-in-out (the shield opts out of the tumble).
export function swayDegAt(phase: number): number {
  return -SWAY_MAX_DEG + 2 * SWAY_MAX_DEG * pingPong(phase);
}
