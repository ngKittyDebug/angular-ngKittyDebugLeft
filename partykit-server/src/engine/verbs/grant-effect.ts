import type { CoreInteractionSpec } from '@game/engine/definition';

import type { ItemInteraction } from './types';

type GrantEffectSpec<TEffectId extends string> = Extract<
  CoreInteractionSpec<TEffectId>,
  { verb: 'grantEffect' }
>;

/**
 * `grantEffect`: grants a timed effect to the taker and removes the item, optionally healing/damaging `hpDelta`
 * alongside. The engine reports an `effectGranted` (not `eaten`) so eat FX/stats stay untouched, while any
 * `hpDelta` rides along as a plain hp delta (a lethal one faints the taker — the effect vanishes with them, so
 * granting alongside the damage is safe).
 */
export function resolveGrantEffect<TEffectId extends string>(
  spec: GrantEffectSpec<TEffectId>,
  takerId: string,
): ItemInteraction<TEffectId> {
  const hp = spec.hpDelta ?? 0;

  return {
    hpDeltas: hp === 0 ? [] : [{ playerId: takerId, amount: hp, source: 'item' }],
    consumed: true,
    effects: [{ playerId: takerId, kind: spec.effectId, durationMs: spec.durationMs }],
  };
}
