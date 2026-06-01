import { describe, expect, it } from 'vitest';

import { GAME } from '@game/frenzy/constants';
import type { Item, ItemType, Player, ServerState } from '@game/frenzy/types';

import { getItemBehavior } from '../engine/item-behaviors';

const ITEM_TYPES: ItemType[] = ['food', 'rotten', 'rock', 'rareCandy'];
const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

function item(type: ItemType): Item {
  return { id: 'i1', type, x: 0.5, y: 0.5, vy: GAME.fallSpeed[type] };
}

const PLAYER: Player = {
  id: 'p1',
  name: 'Ash',
  line: 'caterpie',
  stage: 1,
  mass: 100,
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
};

describe('item behaviors', () => {
  it('grabbing any item gives the clicker its per-type mass delta and consumes it', () => {
    for (const type of ITEM_TYPES) {
      const interaction = getItemBehavior(type).onClick(item(type), 'p1', EMPTY_STATE);

      expect(interaction.consumed).toBe(true);
      expect(interaction.massDeltas).toEqual([{ playerId: 'p1', amount: GAME.itemEffects[type] }]);
    }
  });

  it('current items have no landing behavior', () => {
    for (const type of ITEM_TYPES) {
      expect(getItemBehavior(type).onLand).toBeUndefined();
    }
  });

  it('drifting into edible items (food, rareCandy, rotten) applies their mass delta like a click', () => {
    for (const type of ['food', 'rareCandy', 'rotten'] as ItemType[]) {
      const interaction = getItemBehavior(type).onCollide?.(item(type), PLAYER, EMPTY_STATE);

      expect(interaction).toEqual({
        consumed: true,
        massDeltas: [{ playerId: 'p1', amount: GAME.itemEffects[type] }],
      });
    }
  });

  it('a rock collision damages the Pokémon and consumes the rock', () => {
    const interaction = getItemBehavior('rock').onCollide?.(item('rock'), PLAYER, EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      massDeltas: [{ playerId: 'p1', amount: GAME.collision.rockDamage }],
    });
  });

  it('drifting into rotten poisons the Pokémon (its negative mass delta) and consumes it', () => {
    const interaction = getItemBehavior('rotten').onCollide?.(item('rotten'), PLAYER, EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      massDeltas: [{ playerId: 'p1', amount: GAME.itemEffects.rotten }],
    });
  });
});
