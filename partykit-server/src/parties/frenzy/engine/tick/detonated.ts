import { FRENZY } from '@game/frenzy/config';
import type { DetonatedEvent, Item } from '@game/frenzy/types';

import type { HpDelta } from '../item-behaviors';

/**
 * A bomb blast as a client-facing event: FX + sound for everyone. The damaged-but-alive hpes reconcile on
 * the next snapshot; faints arrive as their own events from applyHpDeltas. `radius` defaults to the item mine's
 * `FRENZY.bomb.blastRadius`; the NPC's strong blast passes its stage-scaled radius so the FX matches its true reach.
 */
export function detonated(
  item: Item,
  hpDeltas: readonly HpDelta[],
  radius: number = FRENZY.bomb.blastRadius,
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
