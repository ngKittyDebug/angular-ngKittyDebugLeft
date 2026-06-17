import type { EffectDefinition } from '../../../engine/definition';

/**
 * Pooping (poop pickup): the cursed twin of `laying` — same emission loop, but the holder only sprays the nasty
 * `poopEmit` pool (rock/brick/bomb) out behind itself, on a faster drip. Shares the egg's launch geometry but a
 * slightly hotter `backSpeed` (tuned for the lighter rock/brick; the heavy bomb overrides it via its
 * `emitLaunchSpeed`). Same `emitter` exclusive group as `laying`.
 */
export const POOPING_EFFECT = {
  emission: {
    intervalMs: 1000,
    poolId: 'poopEmit',
    launch: { back: 0.012, down: 0.008, backSpeed: 0.1, angleJitter: 0.4 },
  },
  exclusiveGroup: 'emitter',
} as const satisfies EffectDefinition;
