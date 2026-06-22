/**
 * Weighted random pick over a weight map (one of the game's spawn pools): walk the cumulative sum until the
 * roll lands in a bucket. Generic over the weight map so adding item types needs no change here — only a new
 * weight entry — and so callers can pass a different pool (e.g. an emitting aura's curated pool).
 *
 * Disabled items (the definitions' `enabled` flags) are filtered out before the walk, so a feature-flagged-off
 * item never spawns on any path. `isEnabled` is injected so the gating is testable. KEY ORDER of `weights` is
 * load-bearing: the cumulative walk maps the rng roll to buckets in entry order.
 * Invariant: at least one item in the map stays enabled, so the pool is never empty.
 */
export function pickItemType<TItemId extends string>(
  rng: () => number,
  isEnabled: (type: TItemId) => boolean,
  weights: Readonly<Partial<Record<TItemId, number>>>,
): TItemId {
  const entries = (Object.entries(weights) as [TItemId, number][]).filter(
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
