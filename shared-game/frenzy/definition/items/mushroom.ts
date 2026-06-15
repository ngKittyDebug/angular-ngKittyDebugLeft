import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GAMBLE = {
  verb: 'gamble',
  minDelta: -20,
  maxDelta: 40,
} as const satisfies CoreInteractionSpec;

/**
 * Mushroom: a gamble — eating it (by click or collision) rolls a random integer hp delta within the range.
 * High upside, real downside; rolled server-side at eat time so the outcome never leaks in a snapshot.
 */
export const MUSHROOM_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.15 },
  spawn: { world: 12, eggEmit: 12 },
  interactions: { onClick: GAMBLE, onCollide: GAMBLE },
} as const satisfies ItemDefinition<EffectKey>;
