import type { GameDefinition } from '@game/engine/definition';
import type { Item } from '@game/engine/types';

import { pickItemType } from './pick-item-type';

/**
 * Creates one naturally dropped item: a weighted pick from the `world` spawn pool (disabled items filtered), a
 * random x inside the spawn band, falling at the type's `fallSpeed`. An item whose `onClick` nudge spec carries a
 * `clicksToExplodeRange` gets a hidden random click budget stamped on (the click that spends the last one
 * detonates it — see the budget redirect in `resolveInteraction`); every other item gets none. The rng draw
 * order (type → x → budget) is load-bearing under a seeded rng.
 */
export function spawnItem<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  rng: () => number = Math.random,
  createId: () => string = () => crypto.randomUUID(),
): Item<TItemId> {
  const isEnabled = (candidate: TItemId): boolean => game.items[candidate].enabled;
  const type = pickItemType(rng, isEnabled, game.spawnPools.world);
  const [minX, maxX] = game.spawn.xRange;
  const onClick = game.items[type].interactions.onClick;
  const budgetRange = onClick.verb === 'nudge' ? onClick.clicksToExplodeRange : undefined;

  return {
    id: createId(),
    type,
    x: minX + rng() * (maxX - minX),
    y: 0,
    vy: game.items[type].physics.fallSpeed,
    ...(budgetRange !== undefined
      ? { clicksLeft: budgetRange[0] + Math.floor(rng() * (budgetRange[1] - budgetRange[0] + 1)) }
      : {}),
  };
}
