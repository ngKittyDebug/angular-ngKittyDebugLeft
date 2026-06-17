import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const EAT = { verb: 'eat', hpDelta: -15 } as const satisfies CoreInteractionSpec;

/** Rotten berry: poison — a player that taps it or drifts into it takes the negative delta, same either way. */
export const ROTTEN_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.15 },
  spawn: { world: 15 },
  interactions: { onClick: EAT, onCollide: EAT },
} as const satisfies ItemDefinition<EffectKey>;
