import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GRANT = {
  verb: 'grantEffect',
  effectId: 'cactus',
  durationMs: 30_000,
} as const satisfies CoreInteractionSpec<EffectKey>;

/**
 * Cactus pickup: grants the spiky aura — for the window, the taker's rams deal triple bump damage (see the effect
 * slice). A common-ish world drop that the cursed `pooping` aura ALSO sprays from its `poopEmit` pool (it's a
 * hazard, so it joins the nasty spray; no `eggEmit` — the treat pool stays buff-only). Like barbed-wire it is pure
 * data — grant on both click and collide — but ships ENABLED: the unions carry `cactus`, so the client surfaces
 * (sprite in `ITEM_ART`, legend group, stats counter, effect aura/badge/status/sound maps) all have a cactus
 * entry, enforced at compile time.
 */
export const CACTUS_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.16 },
  spawn: { world: 10, poopEmit: 6 },
  interactions: { onClick: GRANT, onCollide: GRANT },
} as const satisfies ItemDefinition<EffectKey>;
