import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const EAT = { verb: 'eat', hpDelta: 5 } as const satisfies CoreInteractionSpec;

/** Crumb: light but quick — a small snack that falls the fastest of the edibles. */
export const CRUMB_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.25 },
  spawn: { world: 35, eggEmit: 35 },
  interactions: { onClick: EAT, onCollide: EAT },
} as const satisfies ItemDefinition<EffectKey>;
