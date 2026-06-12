import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

/**
 * Closest alive Pokémon overlapping the item (squared compare, no sqrt). Distance is measured in world px
 * (`FRENZY.world`) so the hit area is a true circle, and the reach is the sum of the item's and that Pokémon's
 * physical half-extents — stage-aware, so a bigger Pokémon reaches further — times `collision.catchGenerosity`.
 * The item's own `ownerId` (easter-egg emitter) is skipped, so a Pokémon never collides with the items it laid.
 */
export function findCollisionTarget(item: Item, players: readonly Player[]): Player | undefined {
  const itemHalfPx = FRENZY.physicalSizePx.item / 2;
  let closest: Player | undefined;
  let closestDistanceSquared = Infinity;

  for (const player of players) {
    if (player.status !== 'alive' || player.id === item.ownerId) {
      continue;
    }

    const playerHalfPx = FRENZY.physicalSizePx.player[player.stage] / 2;
    const reachPx = (itemHalfPx + playerHalfPx) * FRENZY.collision.catchGenerosity;
    const dx = (player.x - item.x) * FRENZY.world.width;
    const dy = (player.y - item.y) * FRENZY.world.height;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < reachPx * reachPx && distanceSquared < closestDistanceSquared) {
      closest = player;
      closestDistanceSquared = distanceSquared;
    }
  }

  return closest;
}
