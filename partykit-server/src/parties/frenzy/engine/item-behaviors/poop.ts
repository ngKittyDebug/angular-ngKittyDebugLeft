import { FRENZY } from '@game/frenzy/config';

import { grantEffect } from './shared';
import type { ItemBehavior } from './types';

/**
 * Poop (какашка): the cursed twin of the easter egg. Deals `hpOnPickup` (negative) damage and gives the taker the
 * `pooping` aura — for its duration the Pokémon randomly sprays falling rock/brick/bomb out behind itself (handled
 * by applyEmissions in the game loop). Routed through grantEffect (effects present), so it reports `effectGranted`,
 * not `eaten`; a lethal hit faints the eater and removes them (the effect vanishes with the player), so granting
 * the aura alongside the damage is safe.
 */
export const poopBehavior: ItemBehavior = {
  onClick: (_item, clickerId) =>
    grantEffect(clickerId, 'pooping', FRENZY.poop.durationMs, FRENZY.poop.hpOnPickup),
  onCollide: (_item, player) =>
    grantEffect(player.id, 'pooping', FRENZY.poop.durationMs, FRENZY.poop.hpOnPickup),
};
