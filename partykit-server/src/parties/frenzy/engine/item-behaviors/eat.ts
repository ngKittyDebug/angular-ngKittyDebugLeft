import { eat } from './shared';
import type { ItemBehavior } from './types';

/**
 * Edible items: grabbing or drifting into one applies its per-type hp delta, then it's gone.
 * Covers good berries/candy (positive) and rotten "poison" berries (negative) alike — a Pokémon that
 * drifts into a rotten berry is poisoned by it, same as eating one on click.
 */
export const eatBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (item, player) => eat(item.type, player.id),
};
