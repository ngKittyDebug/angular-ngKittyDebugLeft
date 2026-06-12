import { FRENZY } from '@game/frenzy/config';

import { grantEffect } from './shared';
import type { ItemBehavior } from './types';

/**
 * Shield: grabbing or drifting into it wards the taker (full invulnerability — decay paused, all damage blocked)
 * for the configured window. No hp change.
 */
export const shieldBehavior: ItemBehavior = {
  onClick: (_item, clickerId) => grantEffect(clickerId, 'shield', FRENZY.shield.shieldMs),
  onCollide: (_item, player) => grantEffect(player.id, 'shield', FRENZY.shield.shieldMs),
};
