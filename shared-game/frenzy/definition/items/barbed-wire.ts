import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GRANT = {
  verb: 'grantEffect',
  effectId: 'barbedWire',
  durationMs: 10_000,
} as const satisfies CoreInteractionSpec<EffectKey>;

/**
 * Barbed wire pickup (PHASE-6 DEMO, ships disabled): grants the thorny aura — the taker's rams deal double bump
 * damage for the window (see the effect slice). The whole rollout is flipping the two `enabled` flags (this one
 * and the effect's): the unions grow and the compile errors then point at every client surface to fill — sprite
 * in `ITEM_ART`, legend group in `ITEM_GROUP` + i18n, stats counter, effect aura/status/sound maps. While off,
 * the item sits in the roster and the `world` pool but `pickItemType` filters it from every spawn path, so the
 * golden master stays byte-identical.
 */
export const BARBED_WIRE_ITEM = {
  enabled: false,
  physics: { fallSpeed: 0.16 },
  spawn: { world: 5 },
  interactions: { onClick: GRANT, onCollide: GRANT },
} as const satisfies ItemDefinition<EffectKey>;
