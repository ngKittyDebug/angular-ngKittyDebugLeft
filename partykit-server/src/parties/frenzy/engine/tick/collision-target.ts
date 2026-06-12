import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

/**
 * Closest alive Pokémon whose body box overlaps the item, or undefined.
 *
 * Broad-phase is an axis-aligned bounding box (AABB) test on the Minkowski-sum half-extents in world px — item
 * half plus the player's per-stage half — padded by `collision.catchGenerosity`. Two cheap signed-bound compares
 * reject the vast majority of (item, player) pairs: the X axis is tested first and, only when it overlaps, the Y
 * axis and the bigger height read follow. Squared-distance (no sqrt) is computed solely for the few genuine
 * overlaps, to break ties by closest centre. The item's own `ownerId` (easter-egg emitter) is skipped so a
 * Pokémon never collides with what it laid.
 *
 * Cost is O(players) per item, branch-light and allocation-free. At the room's entity counts (≤20 players, a
 * handful of in-flight items) this beats a spatial grid/hash, whose per-tick bucket rebuild and lookups cost more
 * than the few hundred compares it would save — the brute-force AABB IS the optimal choice at this scale.
 */
export function findCollisionTarget(item: Item, players: readonly Player[]): Player | undefined {
  const itemHalfPx = FRENZY.physicalSizePx.item / 2;
  const generosity = FRENZY.collision.catchGenerosity;
  const worldWidth = FRENZY.world.width;
  const worldHeight = FRENZY.world.height;
  const itemX = item.x;
  const itemY = item.y;
  const ownerId = item.ownerId;
  let closest: Player | undefined;
  let closestDistanceSquared = Infinity;

  for (const player of players) {
    if (player.status !== 'alive' || player.id === ownerId) {
      continue;
    }

    const stageBody = player.body[player.stage];
    const reachX = (itemHalfPx + stageBody.width / 2) * generosity;
    const dx = (player.x - itemX) * worldWidth;

    // X-axis reject first (cheaper, and items are sparse horizontally) — skips the height read and Y math below.
    if (dx > reachX || dx < -reachX) {
      continue;
    }

    const reachY = (itemHalfPx + stageBody.height / 2) * generosity;
    const dy = (player.y - itemY) * worldHeight;

    if (dy > reachY || dy < -reachY) {
      continue;
    }

    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < closestDistanceSquared) {
      closest = player;
      closestDistanceSquared = distanceSquared;
    }
  }

  return closest;
}
