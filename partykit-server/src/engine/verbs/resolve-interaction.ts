import type { ItemDefinition } from '@game/engine/definition';

import { resolveEat } from './eat';
import { resolveExplode } from './explode';
import { resolveGamble } from './gamble';
import { resolveGrantEffect } from './grant-effect';
import { resolveNudge } from './nudge';
import type { InteractionContext, ItemInteraction } from './types';

/** An item's per-trigger verb descriptors, as authored in its definition slice. */
export type ItemInteractions<TEffectId extends string = string> =
  ItemDefinition<TEffectId>['interactions'];

/** The three engine triggers an item can declare a verb for. */
export type InteractionTrigger = keyof ItemInteractions;

/**
 * Resolves one trigger of an item's interactions through the CLOSED verb set (see `CoreInteractionSpec`):
 * looks the trigger's descriptor up and dispatches to the verb's resolver. Returns `undefined` when the trigger
 * is undeclared or `none` (ignored entirely), and when a taker verb (eat/gamble/grantEffect) fires on a
 * taker-less trigger (a landing). `toInventory` is a reserved seam with no resolver — fail fast so a descriptor
 * can't silently no-op.
 *
 * One special dispatch rule, ahead of the verb switch: a `nudge` whose item has spent its hidden click budget
 * (`clicksLeft <= 1`, stamped from `clicksToExplodeRange` at spawn) detonates instead of shoving — with the
 * item's collide/land `explode` spec (an explosive's triggers share one blast). An aura-emitted explosive has no
 * budget (`clicksLeft` undefined) and never click-detonates.
 */
export function resolveInteraction<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  interactions: ItemInteractions<TEffectId>,
  trigger: InteractionTrigger,
  context: InteractionContext<TItemId, TEffectId, TNpcId>,
): ItemInteraction<TEffectId> | undefined {
  const spec = interactions[trigger];

  if (spec === undefined || spec.verb === 'none') {
    return undefined;
  }

  if (
    spec.verb === 'nudge' &&
    context.item.clicksLeft !== undefined &&
    context.item.clicksLeft <= 1
  ) {
    // Picked by VERB, not by trigger presence, so a non-explode onCollide can't shadow an explode onLand.
    const blast = [interactions.onCollide, interactions.onLand].find(
      (candidate) => candidate !== undefined && candidate.verb === 'explode',
    );

    if (blast !== undefined && blast.verb === 'explode') {
      return resolveExplode(blast, context);
    }
  }

  switch (spec.verb) {
    case 'eat':
      return context.takerId === undefined
        ? undefined
        : resolveEat<TEffectId>(spec, context.takerId);
    case 'gamble':
      return context.takerId === undefined
        ? undefined
        : resolveGamble<TEffectId>(spec, context.takerId, context.rng ?? Math.random);
    case 'grantEffect':
      return context.takerId === undefined ? undefined : resolveGrantEffect(spec, context.takerId);
    case 'nudge':
      return resolveNudge(spec, context);
    case 'explode':
      return resolveExplode(spec, context);
    case 'toInventory':
      throw new Error(`Interaction verb 'toInventory' is a reserved seam with no resolver yet`);
  }
}
