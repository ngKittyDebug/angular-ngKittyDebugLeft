import { FRENZY } from '@game/frenzy/config';

import { grantEffect } from './shared';
import type { ItemBehavior } from './types';

/**
 * Vitamin: heals `hp` mass on pickup and grants `wellFed` — pausing only natural decay for a long window
 * (damage still lands). A "keep fed" buff, not a ward.
 */
export const vitaminBehavior: ItemBehavior = {
  onClick: (_item, clickerId) =>
    grantEffect(clickerId, 'wellFed', FRENZY.vitamin.decayPauseMs, FRENZY.vitamin.hp),
  onCollide: (_item, player) =>
    grantEffect(player.id, 'wellFed', FRENZY.vitamin.decayPauseMs, FRENZY.vitamin.hp),
};
