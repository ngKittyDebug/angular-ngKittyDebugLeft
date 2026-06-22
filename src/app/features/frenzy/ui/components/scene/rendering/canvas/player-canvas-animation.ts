// JS port of the player-sprite visual states from scene-player.component.scss, so the canvas players-pass renders
// each sprite identically to the DOM `<img>` it replaces. Pure + unit-tested; the canvas service applies the
// returned flip/filter/scale via ctx.scale / ctx.filter. The DOM sprite itself does NOT breathe or sway (its
// "animation" is the GIF, preserved by drawing the live frame) — only the facing flip, the mood/anger filters and
// the one-shot evolve pulse change it, so only those are ported here (see the plan's Task 8a correction; ADR 0006).

import { lerp } from '../shared/keyframe-easing';

// Facing flip: the DOM writer sets `--scene-facing` to -1 when the sprite faces right (mirrored) and 1 otherwise,
// fed into scaleX(var(--scene-facing)). The canvas flip is the same scaleX value.
export function facingScaleX(facingRight: boolean): 1 | -1 {
  return facingRight ? -1 : 1;
}

// Mood desaturation for a starving/sad Pokémon — mirrors `.scene__sprite--sad`.
export const SAD_FILTER = 'saturate(0.6) brightness(0.85)';

// Angry-bomb NPC reddening as its anger ramps (0..1) — mirrors `.scene__sprite--npc`. At rest (0) it is a no-op
// tint (saturate(1) + a zero-radius transparent glow), exactly as the DOM filter evaluates at `--npc-anger: 0`.
export function npcAngerFilter(anger: number): string {
  return `saturate(${1 + anger * 1.6}) drop-shadow(0 0 ${anger * 10}px rgba(255, 40, 0, ${anger}))`;
}

// One-shot evolve celebration (mirrors the `scene-evolve-pulse` keyframes, 1.5s): a bright glow bloom + a scale
// punch that peaks at 35% then settles back. The canvas service stamps the pulse start on the rising edge of
// `isEvolving` and drives it off the same `now` it draws with, so no animation-clock is threaded through.
export const EVOLVE_MS = 1500;

// Keyframe peaks (scene-evolve-pulse 35% stop): brightness 2.2, a 24px golden glow, scale 1.3.
const EVOLVE_PEAK_FRACTION = 0.35;
const EVOLVE_PEAK_BRIGHTNESS = 2.2;
const EVOLVE_PEAK_GLOW_PX = 24;
const EVOLVE_PEAK_SCALE = 1.3;

export interface EvolvePulse {
  filter: string;
  scale: number;
}

// Quadratic ease-out (≈ CSS `ease-out` on this short flash) for `u` in 0..1.
function easeOut(u: number): number {
  return 1 - (1 - u) * (1 - u);
}

// The pulse state at `elapsedMs` since the evolve started, or null outside the 1.5s window (before it, or once it
// has settled — the caller then draws the sprite untouched). Brightness/glow/scale ramp up to the 35% peak and back
// down to the resting values, each segment eased-out like the CSS animation.
export function evolvePulseAt(elapsedMs: number): EvolvePulse | null {
  if (elapsedMs < 0 || elapsedMs >= EVOLVE_MS) {
    return null;
  }

  const t = elapsedMs / EVOLVE_MS;
  const rising = t < EVOLVE_PEAK_FRACTION;
  const u = rising
    ? easeOut(t / EVOLVE_PEAK_FRACTION)
    : easeOut((t - EVOLVE_PEAK_FRACTION) / (1 - EVOLVE_PEAK_FRACTION));

  const brightness = rising
    ? lerp(1, EVOLVE_PEAK_BRIGHTNESS, u)
    : lerp(EVOLVE_PEAK_BRIGHTNESS, 1, u);
  const glowPx = rising ? lerp(0, EVOLVE_PEAK_GLOW_PX, u) : lerp(EVOLVE_PEAK_GLOW_PX, 0, u);
  const glowAlpha = rising ? lerp(0, 1, u) : lerp(1, 0, u);
  const scale = rising ? lerp(1, EVOLVE_PEAK_SCALE, u) : lerp(EVOLVE_PEAK_SCALE, 1, u);

  return {
    filter: `brightness(${brightness}) drop-shadow(0 0 ${glowPx}px rgba(255, 240, 150, ${glowAlpha}))`,
    scale,
  };
}
