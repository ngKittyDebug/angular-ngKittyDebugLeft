import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const EAT = { verb: 'eat', hpDelta: 25 } as const satisfies CoreInteractionSpec;

/** Golden berry: a rich heal that drops a touch faster — catch it before it's gone. */
export const GOLDEN_BERRY_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.18 },
  spawn: { world: 5, eggEmit: 5 },
  interactions: { onClick: EAT, onCollide: EAT },
} as const satisfies ItemDefinition<EffectKey>;
