import type { GameEvent, Item, ServerState } from '@game/frenzy/types';

import { applyHpDeltas } from '../apply-hp-deltas';
import { itemFaintCause } from '../faint-cause';
import { getItemBehavior } from '../item-behaviors';
import { detonated } from './detonated';

export interface LandingResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Landing pass for items that reached the floor this tick (`expired` — already removed from the live field).
 * Runs each item's `onLand` (explosives blast; others have none), applies the resulting hp deltas and reports
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
    const resolved = applyHpDeltas(working, interaction.hpDeltas, itemFaintCause(item));

    working = resolved.state;

    if (interaction.explodes) {
      events.push(detonated(item, interaction.hpDeltas));
    }

    events.push(...resolved.events);
  }

  return { state: working, events };
}
