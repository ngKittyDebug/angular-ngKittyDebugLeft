import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GRANT = {
  verb: 'grantEffect',
  effectId: 'laying',
  durationMs: 10_000,
  hpDelta: 10,
} as const satisfies CoreInteractionSpec<EffectKey>;

/**
 * Easter egg: a small heal plus the `laying` aura — the holder drips treats from the `eggEmit` pool out behind
 * itself for the duration (see the effect slice for the emission tuning). Deliberately absent from every
 * emission pool, so the aura can never self-replicate.
 */
export const EASTER_EGG_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.18 },
  spawn: { world: 12 },
  interactions: { onClick: GRANT, onCollide: GRANT },
} as const satisfies ItemDefinition<EffectKey>;
