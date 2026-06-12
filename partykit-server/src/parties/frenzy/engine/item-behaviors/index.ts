import type { ItemType } from '@game/frenzy/types';

import { bombBehavior } from './bomb';
import { brickBehavior } from './brick';
import { easterEggBehavior } from './easter-egg';
import { eatBehavior } from './eat';
import { gambleBehavior } from './mushroom';
import { poopBehavior } from './poop';
import { rockBehavior } from './rock';
import { shieldBehavior } from './shield';
import type { ItemBehavior } from './types';
import { vitaminBehavior } from './vitamin';

export type { EffectGrant, ItemBehavior, ItemInteraction, HpDelta, PlayerImpulse } from './types';

const ITEM_BEHAVIORS: Record<ItemType, ItemBehavior> = {
  food: eatBehavior,
  rotten: eatBehavior,
  rock: rockBehavior,
  brick: brickBehavior,
  rareCandy: eatBehavior,
  bomb: bombBehavior,
  goldenBerry: eatBehavior,
  crumb: eatBehavior,
  mushroom: gambleBehavior,
  vitamin: vitaminBehavior,
  shield: shieldBehavior,
  easterEgg: easterEggBehavior,
  poop: poopBehavior,
};

/** The per-type rules for an item: how it reacts to a click, a mid-air collision and hitting the floor. */
export function getItemBehavior(type: ItemType): ItemBehavior {
  return ITEM_BEHAVIORS[type];
}
