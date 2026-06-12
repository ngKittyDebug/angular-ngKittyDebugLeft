import { FRENZY } from '@game/frenzy/config';

import { grantEffect } from './shared';
import type { ItemBehavior } from './types';

/**
 * Easter egg: heals `hpOnPickup` mass and gives the taker the `laying` aura — for its duration the Pokémon
 * randomly sprays falling items (incl. bombs) out behind itself (handled by applyEmissions in the game loop).
 */
export const easterEggBehavior: ItemBehavior = {
  onClick: (_item, clickerId) =>
    grantEffect(clickerId, 'laying', FRENZY.easterEgg.durationMs, FRENZY.easterEgg.hpOnPickup),
  onCollide: (_item, player) =>
    grantEffect(player.id, 'laying', FRENZY.easterEgg.durationMs, FRENZY.easterEgg.hpOnPickup),
};
