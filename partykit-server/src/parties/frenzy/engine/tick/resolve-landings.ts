import type { GameEvent, Item, ServerState } from '@game/frenzy/types';

import { applyMassDeltas } from '../apply-mass-deltas';
import { getItemBehavior } from '../item-behaviors';
import { detonated } from './detonated';

export interface LandingResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Landing pass for items that reached the floor this tick (`expired` — already removed from the live field).
 * Runs each item's `onLand` (explosives blast; others have none), applies the resulting mass deltas and reports
 * a `detonated` event when it explodes.
 */
export function resolveLandings(state: ServerState, expired: readonly Item[]): LandingResult {
  let working = state;
  const events: GameEvent[] = [];

  for (const item of expired) {
    const onLand = getItemBehavior(item.type).onLand;

    if (onLand === undefined) {
      continue;
    }

    const interaction = onLand(item, working);
    const resolved = applyMassDeltas(working, interaction.massDeltas);

    working = resolved.state;

    if (interaction.explodes) {
      events.push(detonated(item, interaction.massDeltas));
    }

    events.push(...resolved.events);
  }

  return { state: working, events };
}
