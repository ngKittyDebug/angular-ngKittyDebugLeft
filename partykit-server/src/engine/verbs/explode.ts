import type { CoreInteractionSpec } from '@game/engine/definition';

import { computeBlast } from './compute-blast';
import type { InteractionContext, ItemInteraction } from './types';

type ExplodeSpec = Extract<CoreInteractionSpec, { verb: 'explode' }>;

/**
 * `explode`: a distance-scaled area blast at the item's position — every alive, unwarded player within
 * `blastRadius` takes quadratic-falloff damage AND a radial knockback kick (friendly fire included). Skipped
 * entirely: fully blast-warded players, and the item's own `ownerId` while it is still un-armed (a freshly
 * emitted explosive won't blast its emitter — once it drifts out of range and arms, the emitter is fair game
 * again). `explodes` tells the engine to report a `detonated` event (not `eaten`) with the spec's radius,
 * whatever the trigger. The per-player falloff math lives in the shared `computeBlast` (reused by NPC blasts).
 */
export function resolveExplode<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  spec: ExplodeSpec,
  context: InteractionContext<TItemId, TEffectId, TNpcId>,
): ItemInteraction<TEffectId> {
  const { item, state } = context;
  // Owner-immunity only holds while the item still hugs its emitter; once armed (separated) it can blast them too.
  const immuneOwnerId = item.armed === true ? undefined : item.ownerId;
  const { hpDeltas, impulses } = computeBlast(
    context.effects,
    {
      x: item.x,
      y: item.y,
      radius: spec.blastRadius,
      maxDamage: spec.maxDamage,
      minDamage: spec.minDamage,
      blastImpulse: spec.blastImpulse,
      blastImpulseMaxFactor: spec.blastImpulseMaxFactor,
    },
    state.players,
    immuneOwnerId,
  );

  return { hpDeltas, impulses, consumed: true, explodes: { radius: spec.blastRadius } };
}
