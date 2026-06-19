// JS port of the kelp `aq-plant-sway` CSS keyframe (aquarium-decor.component.scss), so the canvas decor backend sways
// the blades identically to the DOM backdrop. Pure + unit-tested; the decor service feeds a phase (an unbounded
// `(now + delay) / cycleMs`, wrapped here) and applies the returned angle via ctx.rotate. The eased keyframe uses
// smoothstep as the ease-in-out — visually indistinguishable from CSS's default cubic-bezier on this small rock,
// and cheap per frame (the same approximation the item canvas uses).

import { easeInOut, fractional } from './keyframe-easing';

// Eased there-and-back over a cycle: 0 at phase 0 and 1, 1 at phase 0.5 — the shape the `alternate` sway keyframe
// traces (rot at 0% → -rot at 100%, ping-ponged by `animation-direction: alternate`).
function pingPong(phase: number): number {
  const t = fractional(phase);

  return t < 0.5 ? easeInOut(t / 0.5) : easeInOut((1 - t) / 0.5);
}

// Sway rotation (deg) of a swaying blade at a phase: the keyframe holds `rotate(rotDeg)` at one extreme and
// `rotate(-rotDeg)` at the other, eased both ways — so at phase 0 it sits at +rotDeg and at phase 0.5 at -rotDeg.
// `rotDeg` is the blade's base lean (negative in the field); a still (non-swaying) blade just uses `rotDeg * 0.5`.
export function plantSwayDegAt(phase: number, rotDeg: number): number {
  return rotDeg * (1 - 2 * pingPong(phase));
}
