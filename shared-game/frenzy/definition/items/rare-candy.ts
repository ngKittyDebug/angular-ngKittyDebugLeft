import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const EAT = { verb: 'eat', hpDelta: 30 } as const satisfies CoreInteractionSpec;

/** Rare candy: the big heal, rare on purpose — the jackpot of both the world drops and the egg-aura pool. */
export const RARE_CANDY_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.15 },
  spawn: { world: 5, eggEmit: 5 },
  interactions: { onClick: EAT, onCollide: EAT },
} as const satisfies ItemDefinition<EffectKey>;
