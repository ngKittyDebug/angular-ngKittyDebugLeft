import { FRENZY } from '@game/frenzy/config';
import type { DetonatedEvent, Item } from '@game/frenzy/types';

import type { MassDelta } from '../item-behaviors';

/**
 * A bomb blast as a client-facing event: FX + sound for everyone. The damaged-but-alive masses reconcile on
 * the next snapshot; faints arrive as their own events from applyMassDeltas.
 */
export function detonated(item: Item, massDeltas: readonly MassDelta[]): DetonatedEvent {
  return {
    type: 'detonated',
    itemId: item.id,
    x: item.x,
    y: item.y,
    radius: FRENZY.bomb.blastRadius,
    playerIds: massDeltas.map((delta) => delta.playerId),
  };
}
