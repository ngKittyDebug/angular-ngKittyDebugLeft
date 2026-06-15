import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const EAT = { verb: 'eat', hpDelta: 10 } as const satisfies CoreInteractionSpec;

/** Food: the staple berry — a modest heal whether tapped or drifted into. Backbone of both the world drop mix and the egg-aura treat pool. */
export const FOOD_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.15 },
  spawn: { world: 55, eggEmit: 55 },
  interactions: { onClick: EAT, onCollide: EAT },
} as const satisfies ItemDefinition<EffectKey>;
