import { FRENZY, isItemEnabled } from '@game/frenzy/config';
import type { ItemType } from '@game/frenzy/types';

/**
 * Weighted random pick over FRENZY.spawnWeights: walk the cumulative sum until the roll lands in a bucket.
 * Generic over the weight map so adding item types needs no change here — only a new weight entry.
 *
 * Disabled items (see `FRENZY.features.items`) are filtered out before the walk, so a feature-flagged-off item
 * never spawns on any path. `isEnabled` is injected (defaults to the real flag check) so the gating is testable.
 * Invariant: at least one item stays enabled, so the pool is never empty.
 */
export function pickItemType(
  rng: () => number,
  isEnabled: (type: ItemType) => boolean = isItemEnabled,
): ItemType {
  const entries = (Object.entries(FRENZY.spawnWeights) as [ItemType, number][]).filter(
    ([type, weight]) => weight > 0 && isEnabled(type),
  );
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = rng() * total;

  let cumulative = 0;

  for (const [type, weight] of entries) {
    cumulative += weight;

    if (roll < cumulative) {
      return type;
    }
  }

  // Unreachable for roll < total; satisfies the return type if floating-point lands exactly on the sum.
  return entries[entries.length - 1][0];
}
