import type { EffectDefinition } from '../../../engine/definition';

/**
 * Cactus — a spiky aura that punishes whoever rams its holder: the holder's outgoing bump damage is TRIPLED for
 * the window (a defensive, reactive trade — the holder still takes its own bump hit, it just wins the exchange).
 * Proves "a new effect is a slice file, not an engine edit": the generic bump pass already consults `damageDealt`
 * (see `engine/core/effect-modifiers.ts`), so this slice plus the granting item is the ENTIRE server-side feature.
 * Enabled (no `enabled` flag, like shield/wellFed) → the kind is in the public `PlayerEffectKind` union, so every
 * exhaustive client `Record` (aura, badge, status, sound, stats) must carry a cactus entry.
 */
export const CACTUS_EFFECT = {
  modifiers: { damageDealt: { bump: 3 } },
} as const satisfies EffectDefinition;
