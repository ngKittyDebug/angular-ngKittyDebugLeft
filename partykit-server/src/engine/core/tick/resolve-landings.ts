import type { GameDefinition } from '@game/engine/definition';
import type { GameEvent, Item, ServerState } from '@game/engine/types';

import { applyHpDeltas } from '../apply-hp-deltas';
import { applyImpulses } from '../apply-impulses';
import { itemFaintCause } from '../faint-cause';
import { resolveInteraction } from '../../verbs';
import { detonated } from './detonated';

export interface LandingResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  events: GameEvent<TItemId, TEffectId>[];
}

/**
 * Landing pass for items that reached the floor this tick (`expired` — already removed from the live field).
 * Runs each item's `onLand` (explosives blast; others have none), applies the resulting hp deltas and reports
 * a `detonated` event when it explodes.
 */
export function resolveLandings<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  expired: readonly Item<TItemId>[],
): LandingResult<TItemId, TEffectId, TNpcId> {
  let working = state;
  const events: GameEvent<TItemId, TEffectId>[] = [];

  for (const item of expired) {
    const interaction = resolveInteraction(game.items[item.type].interactions, 'onLand', {
      item,
      state: working,
      effects: game.effects,
    });

    if (interaction === undefined) {
      continue;
    }

    const resolved = applyHpDeltas(game, working, interaction.hpDeltas, itemFaintCause(item));

    working = applyImpulses(resolved.state, interaction.impulses ?? []);

    if (interaction.explodes) {
      events.push(detonated(item, interaction.hpDeltas, interaction.explodes.radius));
    }

    events.push(...resolved.events);
  }

  return { state: working, events };
}
