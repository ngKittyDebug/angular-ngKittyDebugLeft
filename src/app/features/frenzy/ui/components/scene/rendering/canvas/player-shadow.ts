// JS port of the grounding-shadow visual states from scene-player.component.scss (`.scene__shadow`), so the canvas
// players-pass draws the same soft contact ellipse the DOM does — neutral theme base, the dominant-effect tint, and
// the breathe pulse — BEHIND each canvas sprite (the DOM shadow can't: a z-index:-1 layer only sorts within the
// player's own DOM stack, so once the sprite moves to the canvas the DOM shadow would paint over it). Pure +
// unit-tested; the canvas service applies the returned core colour + breathe transform via ctx.

import { lerp, pingPong } from '../shared/keyframe-easing';

// The ellipse is ~1.5× the sprite WIDTH with a flat 0.28 height profile (mirrors `.scene__shadow` width/height).
export const SHADOW_WIDTH_SCALE = 1.5;
export const SHADOW_HEIGHT_RATIO = 0.28;
// Gradient stops (fractions of the radius): the core holds solid to 30% then fades out by 84% (the rest is
// transparent), so the soft diffuse edge is baked into the gradient — no per-actor blur pass.
export const SHADOW_CORE_STOP = 0.3;
export const SHADOW_FADE_STOP = 0.84;

// Per-effect tint cores — the JS port of the `--aura-*-tint` vars (scene-player `:host`), keyed by the dominant
// `shadowEffectClass` the view model carries. None present (neutral) → the caller uses the theme `--scene-actor-shadow`.
const SHADOW_CORES: Readonly<Record<string, string>> = {
  'scene__shadow--shield': 'rgba(90, 190, 255, 0.9)',
  'scene__shadow--wellFed': 'rgba(150, 230, 150, 0.85)',
  'scene__shadow--laying': 'rgba(210, 160, 255, 0.85)',
  'scene__shadow--pooping': 'rgba(120, 85, 50, 0.9)',
  'scene__shadow--cactus': 'rgba(120, 200, 90, 0.9)',
};

// The gradient-core tint for a player's dominant effect, or null when none is active (the caller draws the neutral
// theme shadow, which does not breathe).
export function shadowCoreFor(shadowEffectClass: string | null): string | null {
  return shadowEffectClass === null ? null : (SHADOW_CORES[shadowEffectClass] ?? null);
}

// Breathe cycle (ms) — matches `scene-actor-shadow-breathe` (2.6s) applied to a tinted shadow.
const SHADOW_BREATHE_MS = 2600;
const BREATHE_MIN_OPACITY = 0.78;
const BREATHE_MAX_OPACITY = 1;
const BREATHE_MIN_SCALE = 0.97;
const BREATHE_MAX_SCALE = 1.06;

export interface ShadowBreathe {
  opacity: number;
  scale: number;
}

// The tinted shadow's breathe (opacity + uniform scale) at draw-clock `now`; matches the 2.6s ease-in-out keyframes.
// All tinted shadows breathe off the same clock (a visually negligible loss of the DOM's per-element start phase,
// like the canvas item breathe), so no per-player timer is threaded through. The neutral shadow opts out (scale 1,
// full opacity).
export function shadowBreatheAt(now: number): ShadowBreathe {
  const u = pingPong(now / SHADOW_BREATHE_MS);

  return {
    opacity: lerp(BREATHE_MIN_OPACITY, BREATHE_MAX_OPACITY, u),
    scale: lerp(BREATHE_MIN_SCALE, BREATHE_MAX_SCALE, u),
  };
}
