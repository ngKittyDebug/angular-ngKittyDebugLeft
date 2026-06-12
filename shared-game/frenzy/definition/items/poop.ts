import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GRANT = {
  verb: 'grantEffect',
  effectId: 'pooping',
  durationMs: 10_000,
  hpDelta: -10,
} as const satisfies CoreInteractionSpec<EffectKey>;

/**
 * Poop: the cursed twin of the easter egg — a negative hit plus the `pooping` aura, spraying the nasty
 * `poopEmit` pool (rock/brick/bomb) out behind the holder for the duration. A lethal pickup faints the eater
 * and the effect vanishes with them, so granting the aura alongside the damage is safe. Like the egg, absent
 * from every emission pool so the aura can never self-replicate.
 */
export const POOP_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.18 },
  spawn: { world: 6 },
  interactions: { onClick: GRANT, onCollide: GRANT },
} as const satisfies ItemDefinition<EffectKey>;
