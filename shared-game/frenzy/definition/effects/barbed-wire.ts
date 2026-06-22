import type { EffectDefinition } from '../../../engine/definition';

/**
 * Barbed wire (PHASE-6 DEMO, ships disabled): a thorny aura that makes the holder's rams hurt — outgoing bump
 * damage is doubled for the window. Exists to prove "a new effect is a slice file, not an engine edit": the
 * generic bump pass already consults `damageDealt` (see `engine/core/effect-modifiers.ts`), so this slice plus
 * the granting item below is the ENTIRE server-side feature. While `enabled: false` the kind stays out of the
 * public `PlayerEffectKind` union — flip it together with the item's flag to roll out (see the item slice).
 */
export const BARBED_WIRE_EFFECT = {
  enabled: false,
  modifiers: { damageDealt: { bump: 2 } },
} as const satisfies EffectDefinition;
