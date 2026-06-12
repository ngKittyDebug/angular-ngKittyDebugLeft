import { FRENZY } from '@game/frenzy/config';

import { eat } from './shared';
import type { ItemBehavior } from './types';

/**
 * Brick: behaves like a rock — clicking it does nothing (hp delta 0) but removes it, while a falling brick
 * that bonks a Pokémon deals collision damage. The brick just hits twice as hard (`brickDamage`).
 */
export const brickBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (_item, player) => ({
    hpDeltas: [{ playerId: player.id, amount: FRENZY.collision.brickDamage }],
    consumed: true,
  }),
};
