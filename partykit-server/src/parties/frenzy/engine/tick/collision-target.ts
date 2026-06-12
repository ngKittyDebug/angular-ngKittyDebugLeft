import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

/**
 * Closest alive Pokémon whose body box overlaps the item, or undefined.
 *
 * Broad-phase is an axis-aligned bounding box (AABB) test in world px — the item contributes its true half-extent
 * (real edge), and only the player's per-stage half is scaled by `generosity` (the caller's catch reach; defaults
 * to the forgiving `collision.catchGenerosity`, but the bomb passes a tighter value for true-contact detonation),
 * so a bigger Pokémon reaches further without the assist inflating the box past the sprite. Two cheap signed-bound compares
 * reject the vast majority of (item, player) pairs: the X axis is tested first and, only when it overlaps, the Y
 * axis and the bigger height read follow. Squared-distance (no sqrt) is computed solely for the few genuine
 * overlaps, to break ties by closest centre. The item's own `ownerId` (emitter) is skipped so a Pokémon never
 * collides with what it just laid — but only until the item arms (separates); an `armed` item can strike its emitter.
 *
 * Cost is O(players) per item, branch-light and allocation-free. At the room's entity counts (≤20 players, a
 * handful of in-flight items) this beats a spatial grid/hash, whose per-tick bucket rebuild and lookups cost more
 * than the few hundred compares it would save — the brute-force AABB IS the optimal choice at this scale.
 */
export function findCollisionTarget(
  item: Item,
  players: readonly Player[],
  generosity: number = FRENZY.collision.catchGenerosity,
): Player | undefined {
  // The bomb reaches out to its sensor horns (bigger box), so it detonates on horn contact, not just the shell.
  const itemHalfPx =
    (item.type === 'bomb' ? FRENZY.physicalSizePx.bomb : FRENZY.physicalSizePx.item) / 2;
  const worldWidth = FRENZY.world.width;
  const worldHeight = FRENZY.world.height;
  const itemX = item.x;
  const itemY = item.y;
  // Owner-immunity only holds while the emitted item still hugs its owner; once armed (separated) it can strike them.
  const immuneOwnerId = item.armed === true ? undefined : item.ownerId;
  let closest: Player | undefined;
  let closestDistanceSquared = Infinity;

  for (const player of players) {
    if (player.status !== 'alive' || player.id === immuneOwnerId) {
      continue;
    }

    const stageBody = player.body[player.stage];
    const reachX = itemHalfPx + (stageBody.width / 2) * generosity;
    const dx = (player.x - itemX) * worldWidth;

    // X-axis reject first (cheaper, and items are sparse horizontally) — skips the height read and Y math below.
    if (dx > reachX || dx < -reachX) {
      continue;
    }

    const reachY = itemHalfPx + (stageBody.height / 2) * generosity;
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
