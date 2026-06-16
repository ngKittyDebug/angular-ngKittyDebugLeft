import type { EffectDefinition } from '../../../engine/definition';
import { BARBED_WIRE_EFFECT } from './barbed-wire';
import { CACTUS_EFFECT } from './cactus';
import { LAYING_EFFECT } from './laying';
import { POOPING_EFFECT } from './pooping';
import { SHIELD_EFFECT } from './shield';
import { WELL_FED_EFFECT } from './well-fed';

/**
 * The frenzy effect roster — one definition slice per effect. The `PlayerEffectKind` union is derived from this
 * record's ENABLED slices (see `EnabledKey`), so adding an effect file + a line here — or flipping a slice's
 * `enabled` flag on — grows the union (and every exhaustive client `Record`) at compile time. Declaration order
 * is meaningful for emitting auras: the engine picks a player's FIRST matching active emitter, so `laying`
 * outranks `pooping` for a holder of both.
 */
export const FRENZY_EFFECTS = {
  shield: SHIELD_EFFECT,
  wellFed: WELL_FED_EFFECT,
  laying: LAYING_EFFECT,
  pooping: POOPING_EFFECT,
  barbedWire: BARBED_WIRE_EFFECT,
  cactus: CACTUS_EFFECT,
} as const satisfies Record<string, EffectDefinition>;

/** Internal id union of the roster; the public alias is `PlayerEffectKind` in `frenzy/types.ts`. */
export type EffectKey = keyof typeof FRENZY_EFFECTS;
