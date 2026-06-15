import type { EffectDefinition } from '../../../engine/definition';

/**
 * Laying (easter egg): an emitting aura — the holder drips one falling item from the all-positive `eggEmit`
 * pool every `intervalMs`, launched out behind itself (a treat: no nasties, no bomb, no aura items). Mutually
 * exclusive with the other emitting aura via the shared `emitter` group, so a player can never emit twice per tick.
 * Launch geometry: `back`/`down` are the small normalized gaps PAST the body edge (the engine adds half the body
 * size first, so emission scales with the actor); `angleJitter` stays under the bomb's ~0.5 rad horizontal limit
 * so nothing ever launches upward.
 */
export const LAYING_EFFECT = {
  emission: {
    intervalMs: 1500,
    poolId: 'eggEmit',
    launch: { back: 0.012, down: 0.008, backSpeed: 0.08, angleJitter: 0.4 },
  },
  exclusiveGroup: 'emitter',
} as const satisfies EffectDefinition;
