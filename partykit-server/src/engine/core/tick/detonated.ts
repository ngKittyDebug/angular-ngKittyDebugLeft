import type { DetonatedEvent, Item } from '@game/engine/types';

import type { HpDelta } from '../../verbs';

/**
 * An item blast as a client-facing event: FX + sound for everyone. The damaged-but-alive players reconcile on
 * the next snapshot; faints arrive as their own events from applyHpDeltas. `radius` is the resolved blast's true
 * reach (the explode spec's radius via `ItemInteraction.explodes`; an NPC's stage-scaled blast passes its own),
 * so the FX always matches it.
 */
export function detonated<TItemId extends string>(
  item: Item<TItemId>,
  hpDeltas: readonly HpDelta[],
  radius: number,
): DetonatedEvent {
  return {
    type: 'detonated',
    itemId: item.id,
    x: item.x,
    y: item.y,
    radius,
    hits: hpDeltas.map((delta) => ({ playerId: delta.playerId, delta: delta.amount })),
  };
}
