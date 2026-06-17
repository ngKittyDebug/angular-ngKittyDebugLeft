import type { CoreInteractionSpec } from '@game/engine/definition';

import type { ItemInteraction } from './types';

type GambleSpec = Extract<CoreInteractionSpec, { verb: 'gamble' }>;

/**
 * `gamble` (mushroom): rolls a random integer hp delta within `[minDelta, maxDelta]`, then the item is gone.
 * Driven by the injected `rng` so the outcome is deterministic in tests and never leaks in a snapshot (rolled
 * server-side at eat time). Consumes EXACTLY ONE rng draw — load-bearing under the seeded golden master.
 */
export function resolveGamble<TEffectId extends string = string>(
  spec: GambleSpec,
  takerId: string,
  rng: () => number,
): ItemInteraction<TEffectId> {
  const amount = spec.minDelta + Math.floor(rng() * (spec.maxDelta - spec.minDelta + 1));

  return {
    hpDeltas: [{ playerId: takerId, amount, source: 'item' }],
    consumed: true,
  };
}
