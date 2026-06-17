import type { CoreInteractionSpec } from '@game/engine/definition';

import type { InteractionContext, ItemInteraction } from './types';

type NudgeSpec = Extract<CoreInteractionSpec, { verb: 'nudge' }>;

/**
 * `nudge` (bomb): a click doesn't eat the item — it shoves it by adding a fixed inertial impulse
 * (`spec.clickImpulse`) to its drift velocity, in the 2D direction AWAY from the tapped side (the client sends a
 * `nudgeX`/`nudgeY` direction vector; tap the top → push down, the right → push left, etc.). The item then drifts
 * freely (constant-velocity 2D drift + wall bounce, see move-items). Velocity accumulation + the `maxDriftSpeed`
 * cap live in applyClick. Fallback when no direction is supplied: shove away from the nearest horizontal edge.
 * The hidden click budget (`spec.clicksToExplodeRange` → `item.clicksLeft`) is handled at the dispatch
 * (`resolveInteraction`): the click that spends the last one detonates instead of reaching this resolver.
 */
export function resolveNudge<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  spec: NudgeSpec,
  context: InteractionContext<TItemId, TEffectId, TNpcId>,
): ItemInteraction<TEffectId> {
  const { item, nudgeX, nudgeY } = context;
  const dirX = nudgeX !== undefined && Number.isFinite(nudgeX) ? nudgeX : 0;
  const dirY = nudgeY !== undefined && Number.isFinite(nudgeY) ? nudgeY : 0;
  const magnitude = Math.hypot(dirX, dirY);
  // No usable direction → fall back to a horizontal shove away from the nearest edge.
  const [unitX, unitY] =
    magnitude > 0 ? [dirX / magnitude, dirY / magnitude] : [item.x < 0.5 ? 1 : -1, 0];

  return {
    hpDeltas: [],
    consumed: false,
    nudgeX: unitX * spec.clickImpulse,
    nudgeY: unitY * spec.clickImpulse,
  };
}
