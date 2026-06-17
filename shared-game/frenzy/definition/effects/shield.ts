import type { EffectDefinition } from '../../../engine/definition';

/**
 * Shield: full invulnerability inside a bubble — suspends natural hp decay AND wards off all incoming damage
 * (item hits, bomb blasts, player bumps). Granted by the shield pickup (long window) and auto-granted briefly on
 * join/respawn (see `spawnEffects.onJoin`) so a freshly-spawned player gets a grace window.
 */
export const SHIELD_EFFECT = {
  modifiers: {
    decayPaused: true,
    damageTaken: { item: 0, blast: 0, bump: 0 },
  },
} as const satisfies EffectDefinition;
