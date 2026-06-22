// JS ports of the plankton-mote and bubble CSS keyframes (aquarium-decor.component.scss), so the canvas decor backend
// drifts the particles identically to the DOM backdrop. Pure + unit-tested; the decor service feeds an unbounded
// phase (wrapped here) plus each particle's constants, and applies the returned offset/opacity/scale per frame.

import { easeInOut, fractional, lerp } from '../shared/keyframe-easing';

// A mote's per-frame drift offset (px from its base position) and opacity.
export interface MoteState {
  offsetX: number;
  offsetY: number;
  opacity: number;
}

// A bubble's per-frame horizontal offset (px), vertical position (fraction of the world height risen from the
// bottom; matches the DOM `bottom` %), uniform scale, and opacity.
export interface BubbleState {
  offsetX: number;
  bottomFraction: number;
  scale: number;
  opacity: number;
}

// Mote drift (`aq-mote-drift`, ease-in-out infinite ALTERNATE): the keyframe translates 0 → (dx, dy) and pulses
// opacity .15 → peak → .25. `alternate` ping-pongs it, so `phase` spans the full there-and-back cycle (cycleMs =
// 2 × duration). `u` is the forward-leg progress (0 at one extreme, 1 at the other), eased like the CSS.
export function moteDriftAt(phase: number, dx: number, dy: number, peak: number): MoteState {
  const f = fractional(phase);
  const u = f < 0.5 ? f / 0.5 : 1 - (f - 0.5) / 0.5;
  const moved = easeInOut(u);
  const opacity =
    u < 0.5 ? lerp(0.15, peak, easeInOut(u / 0.5)) : lerp(peak, 0.25, easeInOut((u - 0.5) / 0.5));

  return { offsetX: dx * moved, offsetY: dy * moved, opacity };
}

// Bubble rise (`aq-bubble-rise`, LINEAR infinite, not alternate): rises `bottom` -8% → 108%, wobbles X 0 → -drift
// (@50%) → +drift, scales .6 → 1 → 1.05, and fades in/out (opacity 0 → .9 by 8%, holds, → 0 by 100%). `phase` is the
// single-direction progress 0..1 (cycleMs = duration); it loops, restarting each bubble at the bottom.
export function bubbleRiseAt(phase: number, drift: number): BubbleState {
  const p = fractional(phase);
  const bottomFraction = lerp(-0.08, 1.08, p);
  const offsetX = p < 0.5 ? lerp(0, -drift, p / 0.5) : lerp(-drift, drift, (p - 0.5) / 0.5);
  const scale = p < 0.5 ? lerp(0.6, 1, p / 0.5) : lerp(1, 1.05, (p - 0.5) / 0.5);

  let opacity: number;

  if (p < 0.08) {
    opacity = lerp(0, 0.9, p / 0.08);
  } else if (p < 0.92) {
    opacity = 0.9;
  } else {
    opacity = lerp(0.9, 0, (p - 0.92) / 0.08);
  }

  return { offsetX, bottomFraction, scale, opacity };
}
