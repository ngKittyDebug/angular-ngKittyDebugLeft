import type { ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';
import { BARBED_WIRE_ITEM } from './barbed-wire';
import { BOMB_ITEM } from './bomb';
import { BRICK_ITEM } from './brick';
import { CRUMB_ITEM } from './crumb';
import { EASTER_EGG_ITEM } from './easter-egg';
import { FOOD_ITEM } from './food';
import { GOLDEN_BERRY_ITEM } from './golden-berry';
import { MUSHROOM_ITEM } from './mushroom';
import { POOP_ITEM } from './poop';
import { RARE_CANDY_ITEM } from './rare-candy';
import { ROCK_ITEM } from './rock';
import { ROTTEN_ITEM } from './rotten';
import { SHIELD_ITEM } from './shield';
import { VITAMIN_ITEM } from './vitamin';

/**
 * The frenzy item roster — one definition slice per item, holding the entity's WHOLE tuning (flag, physics,
 * spawn-pool memberships, verb descriptors). The `ItemType` union is derived from this record's ENABLED slices
 * (see `EnabledKey`), so adding an item file + a line here — or flipping a slice's `enabled` flag on — grows
 * the union (and every exhaustive client `Record`) at compile time.
 *
 * DECLARATION ORDER IS LOAD-BEARING for derived records (`Object.keys` walks insertion order, and the weighted
 * spawn pick walks pool entries cumulatively with a seeded-rng golden master on top) — append new items at the
 * end, never reorder.
 */
export const FRENZY_ITEMS = {
  food: FOOD_ITEM,
  rotten: ROTTEN_ITEM,
  rock: ROCK_ITEM,
  brick: BRICK_ITEM,
  rareCandy: RARE_CANDY_ITEM,
  bomb: BOMB_ITEM,
  goldenBerry: GOLDEN_BERRY_ITEM,
  crumb: CRUMB_ITEM,
  mushroom: MUSHROOM_ITEM,
  vitamin: VITAMIN_ITEM,
  shield: SHIELD_ITEM,
  easterEgg: EASTER_EGG_ITEM,
  poop: POOP_ITEM,
  barbedWire: BARBED_WIRE_ITEM,
} as const satisfies Record<string, ItemDefinition<EffectKey>>;

/** Internal id union of the roster; the public alias is `ItemType` in `frenzy/types.ts`. */
export type ItemKey = keyof typeof FRENZY_ITEMS;

/** One item's definition as authored (literal types preserved for the derived flat config). */
export type FrenzyItemDefinition = (typeof FRENZY_ITEMS)[ItemKey];
