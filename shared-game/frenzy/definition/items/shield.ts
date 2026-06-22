import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GRANT = {
  verb: 'grantEffect',
  effectId: 'shield',
  durationMs: 15_000,
} as const satisfies CoreInteractionSpec<EffectKey>;

/**
 * Shield pickup: wards the taker (full invulnerability — decay paused, all damage blocked) for the window.
 * No hp change; rare on purpose. The SHORTER spawn-protection ward reuses the same effect via `spawnEffects.onJoin`.
 */
export const SHIELD_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.15 },
  spawn: { world: 6, eggEmit: 6 },
  interactions: { onClick: GRANT, onCollide: GRANT },
} as const satisfies ItemDefinition<EffectKey>;
