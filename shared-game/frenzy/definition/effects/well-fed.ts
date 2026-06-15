import type { EffectDefinition } from '../../../engine/definition';

/**
 * Well-fed (vitamin): suspends only the natural hp decay — incoming damage still lands. A steady "keep-fed"
 * buff, not a ward.
 */
export const WELL_FED_EFFECT = {
  modifiers: {
    decayPaused: true,
  },
} as const satisfies EffectDefinition;
