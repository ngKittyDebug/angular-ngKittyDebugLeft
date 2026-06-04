import { GAME } from '@game/frenzy/constants';
import type { ItemType } from '@game/frenzy/types';

// Weighted random pick over GAME.spawnWeights: walk the cumulative sum until the roll lands in a bucket.
// Generic over the weight map so adding item types needs no change here — only a new weight entry.
export function pickItemType(rng: () => number): ItemType {
  const entries = Object.entries(GAME.spawnWeights) as [ItemType, number][];
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
