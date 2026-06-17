import type { GameDefinition } from '@game/engine/definition';
import type { Item, Player } from '@game/engine/types';

/**
 * Closest alive player whose body box overlaps the item, or undefined.
 *
 * Broad-phase is an axis-aligned bounding box (AABB) test in world px — the item contributes its true half-extent
 * (real edge — its `physics.sizePx` override or the world's shared item box), and only the player's per-stage half
 * is scaled by `generosity` (the caller's catch reach: the forgiving `collision.catchGenerosity` default or the
 * item's stricter `physics.catchGenerosity` override for true-contact detonation), so a bigger player reaches
 * further without the assist inflating the box past the sprite. Two cheap signed-bound compares
 * reject the vast majority of (item, player) pairs: the X axis is tested first and, only when it overlaps, the Y
 * axis and the bigger height read follow. Squared-distance (no sqrt) is computed solely for the few genuine
 * overlaps, to break ties by closest centre. The item's own `ownerId` (emitter) is skipped so a player never
 * collides with what it just laid — but only until the item arms (separates); an `armed` item can strike its emitter.
 *
 * Cost is O(players) per item, branch-light and allocation-free. At the room's entity counts (≤20 players, a
 * handful of in-flight items) this beats a spatial grid/hash, whose per-tick bucket rebuild and lookups cost more
 * than the few hundred compares it would save — the brute-force AABB IS the optimal choice at this scale.
 */
export function findCollisionTarget<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
  players: readonly Player<TEffectId, TNpcId>[],
  generosity: number,
): Player<TEffectId, TNpcId> | undefined {
  // An item may override its collidable box (e.g. a mine reaching out to its sensor horns), so contact matches
  // what the player sees rather than the shared sprite box.
  const itemHalfPx = (game.items[item.type].physics.sizePx ?? game.world.itemSizePx) / 2;
  const worldWidth = game.world.width;
  const worldHeight = game.world.height;
  const itemX = item.x;
  const itemY = item.y;
  // Owner-immunity only holds while the emitted item still hugs its owner; once armed (separated) it can strike them.
  const immuneOwnerId = item.armed === true ? undefined : item.ownerId;
  let closest: Player<TEffectId, TNpcId> | undefined;
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
