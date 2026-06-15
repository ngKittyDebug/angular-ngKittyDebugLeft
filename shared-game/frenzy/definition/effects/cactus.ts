import type { EffectDefinition } from '../../../engine/definition';

/**
 * Cactus — a spiky aura that punishes whoever touches its holder, no engine edit: one `contactRam` modifier makes
 * the holder a contact hazard. It registers a hit even on a lazy touch (closing speed below the ram threshold but
 * above `scratchSpeedThreshold`), one-directional (the holder isn't chipped by a gentle brush), and deals its OWN
 * collision damage split by force — a hard ram takes 12 hp, a gentle scratch only 6 (overriding the generic −5
 * bump). The bump pass consults it (see `engine/core/effect-modifiers.ts`), so this slice plus the granting item is
 * the ENTIRE server-side feature. Enabled (no `enabled` flag, like shield/wellFed) → the kind is in the public
 * `PlayerEffectKind` union, so every exhaustive client `Record` (aura, badge, status, sound, stats) carries cactus.
 */
export const CACTUS_EFFECT = {
  modifiers: { contactRam: { ramDamage: -12, scratchDamage: -6 } },
} as const satisfies EffectDefinition;
