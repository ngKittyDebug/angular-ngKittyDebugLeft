import { GAME } from '@game/frenzy/constants';
import type { Item, ItemType, Player, ServerState } from '@game/frenzy/types';

/** A mass change targeted at one player. Negative amounts are damage. */
export interface MassDelta {
  playerId: string;
  amount: number;
}

/** Outcome of interacting with an item: which mass changes happen and whether the item leaves the field. */
export interface ItemInteraction {
  massDeltas: MassDelta[];
  consumed: boolean;
}

/**
 * Per-type item rules.
 * `onClick` runs when a player grabs the item (server-arbitrated first click).
 * `onLand` runs when the item reaches the floor (e.g. an explosive); omit for "just disappear".
 * `onCollide` runs when the item physically overlaps a drifting Pokémon (resolved against the closest one); omit to ignore collisions.
 * Effects may target the grabber or other players, so collateral interactions are expressible.
 */
export interface ItemBehavior {
  onClick(item: Item, clickerId: string, state: ServerState): ItemInteraction;
  onLand?(item: Item, state: ServerState): ItemInteraction;
  onCollide?(item: Item, player: Player, state: ServerState): ItemInteraction;
}

// Feeding any of these to a player (by click or by drifting into it) applies its fixed per-type mass delta, then the item is gone.
function eat(itemType: ItemType, playerId: string): ItemInteraction {
  return { massDeltas: [{ playerId, amount: GAME.itemEffects[itemType] }], consumed: true };
}

// Edible items: grabbing or drifting into one applies its per-type mass delta, then it's gone.
// Covers good berries/candy (positive) and rotten "poison" berries (negative) alike — a Pokémon that
// drifts into a rotten berry is poisoned by it, same as eating one on click.
const eatBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (item, player) => eat(item.type, player.id),
};

// Rock: clicking it does nothing (mass delta 0) but removes it, while a falling rock that bonks a Pokémon deals collision damage.
const rockBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (_item, player) => ({
    massDeltas: [{ playerId: player.id, amount: GAME.collision.rockDamage }],
    consumed: true,
  }),
};

const ITEM_BEHAVIORS: Record<ItemType, ItemBehavior> = {
  food: eatBehavior,
  rotten: eatBehavior,
  rock: rockBehavior,
  rareCandy: eatBehavior,
};

export function getItemBehavior(type: ItemType): ItemBehavior {
  return ITEM_BEHAVIORS[type];
}
