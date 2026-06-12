import { FRENZY } from '@game/frenzy/config';

import { eat } from './shared';
import type { ItemBehavior } from './types';

/**
 * Rock: clicking it does nothing (mass delta 0) but removes it, while a falling rock that bonks a Pokémon
 * deals collision damage.
 */
export const rockBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (_item, player) => ({
    massDeltas: [{ playerId: player.id, amount: FRENZY.collision.rockDamage }],
    consumed: true,
  }),
};
