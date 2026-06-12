import { FRENZY } from '@game/frenzy/config';

import type { ItemBehavior } from './types';

/**
 * Rolls the mushroom's random integer mass delta within the configured range. Driven by the injected `rng` so
 * the outcome is deterministic in tests and never leaks in a snapshot (rolled server-side at eat time).
 */
function gambleDelta(rng: () => number): number {
  const { maxDelta, minDelta } = FRENZY.mushroom;

  return minDelta + Math.floor(rng() * (maxDelta - minDelta + 1));
}

/**
 * Mushroom: a gamble — eating it (by click or collision) rolls a random integer mass delta within the configured
 * range, then it's gone. High upside, real downside.
 */
export const gambleBehavior: ItemBehavior = {
  onClick: (_item, clickerId, _state, _nudgeX, rng = Math.random) => ({
    massDeltas: [{ playerId: clickerId, amount: gambleDelta(rng) }],
    consumed: true,
  }),
  onCollide: (_item, player, _state, rng = Math.random) => ({
    massDeltas: [{ playerId: player.id, amount: gambleDelta(rng) }],
    consumed: true,
  }),
};
