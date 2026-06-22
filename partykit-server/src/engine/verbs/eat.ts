import type { CoreInteractionSpec } from '@game/engine/definition';

import type { ItemInteraction } from './types';

type EatSpec = Extract<CoreInteractionSpec, { verb: 'eat' }>;

/**
 * `eat`: feeding the item to the taker applies its fixed hp delta (positive heal, negative poison, or a 0 no-op
 * click that still removes it — rock/brick), then the item is gone.
 */
export function resolveEat<TEffectId extends string = string>(
  spec: EatSpec,
  takerId: string,
): ItemInteraction<TEffectId> {
  return {
    hpDeltas: [{ playerId: takerId, amount: spec.hpDelta, source: 'item' }],
    consumed: true,
  };
}
