import { describe, expect, it } from 'vitest';

import { GAME } from '@game/frenzy/constants';
import type { Item, ItemType, Player, ServerState } from '@game/frenzy/types';

import { getItemBehavior } from '../engine/item-behaviors';

const ITEM_TYPES: ItemType[] = ['food', 'rotten', 'rock', 'rareCandy', 'goldenBerry', 'crumb'];
const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

function item(type: ItemType): Item {
  return { id: 'i1', type, x: 0.5, y: 0.5, vy: GAME.fallSpeed[type] };
}

const PLAYER: Player = {
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  stage: 1,
  mass: 100,
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
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

  it('drifting into edible items (food, rareCandy, rotten, goldenBerry, crumb) applies their mass delta like a click', () => {
    for (const type of ['food', 'rareCandy', 'rotten', 'goldenBerry', 'crumb'] as ItemType[]) {
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

describe('bomb behavior', () => {
  // y = 1: the bomb explodes once it reaches the floor, so blast tests place it there.
  function bombAt(x: number): Item {
    return { ...item('bomb'), x, y: 1 };
  }

  function playerAt(id: string, x: number, y: number, status: Player['status'] = 'alive'): Player {
    return { ...PLAYER, id, x, y, status };
  }

  it('a click bats the bomb by the supplied displacement and never eats it', () => {
    const interaction = getItemBehavior('bomb').onClick(bombAt(0.5), 'p1', EMPTY_STATE, -0.1);

    expect(interaction).toEqual({ massDeltas: [], consumed: false, nudgeX: -0.1 });
  });

  it('caps an oversized bat displacement', () => {
    const interaction = getItemBehavior('bomb').onClick(bombAt(0.5), 'p1', EMPTY_STATE, 1);

    expect(interaction.nudgeX).toBe(GAME.bomb.maxNudge);
  });

  it('without a displacement, a click bats the bomb away from the nearest edge (fallback)', () => {
    const fromLeft = getItemBehavior('bomb').onClick(bombAt(0.3), 'p1', EMPTY_STATE);
    const fromRight = getItemBehavior('bomb').onClick(bombAt(0.7), 'p1', EMPTY_STATE);

    expect(fromLeft.nudgeX).toBe(GAME.bomb.nudgeStep);
    expect(fromRight.nudgeX).toBe(-GAME.bomb.nudgeStep);
  });

  it('explodes on landing and damages every alive Pokémon in range, owner included', () => {
    const owner = playerAt('owner', 0.5, 1);
    const nearby = playerAt('near', 0.6, 0.95);
    const faraway = playerAt('far', 0.1, 0.5);
    const offline = playerAt('offline', 0.5, 1, 'disconnected');
    const state: ServerState = {
      players: [owner, nearby, faraway, offline],
      items: [],
      tick: 0,
    };

    const interaction = getItemBehavior('bomb').onLand?.(bombAt(0.5), state);

    expect(interaction?.consumed).toBe(true);
    expect(interaction?.explodes).toBe(true);
    expect(interaction?.massDeltas).toEqual([
      { playerId: 'owner', amount: GAME.bomb.damage },
      { playerId: 'near', amount: GAME.bomb.damage },
    ]);
  });

  it('spares a shielded Pokémon from the blast (skipped, not zero-damage)', () => {
    const owner = playerAt('owner', 0.5, 1);
    const shielded: Player = {
      ...playerAt('shielded', 0.55, 1),
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    };
    const state: ServerState = { players: [owner, shielded], items: [], tick: 0 };

    const interaction = getItemBehavior('bomb').onLand?.(bombAt(0.5), state);

    expect(interaction?.massDeltas).toEqual([{ playerId: 'owner', amount: GAME.bomb.damage }]);
  });

  it('also detonates on mid-air collision — same area blast, not a one-on-one hit', () => {
    const touched = playerAt('touched', 0.5, 0.6);
    const bystander = playerAt('bystander', 0.6, 0.6);
    const faraway = playerAt('far', 0.1, 0.6);
    const state: ServerState = { players: [touched, bystander, faraway], items: [], tick: 0 };

    const interaction = getItemBehavior('bomb').onCollide?.(
      { ...item('bomb'), x: 0.5, y: 0.6 },
      touched,
      state,
    );

    expect(interaction?.consumed).toBe(true);
    expect(interaction?.explodes).toBe(true);
    expect(interaction?.massDeltas).toEqual([
      { playerId: 'touched', amount: GAME.bomb.damage },
      { playerId: 'bystander', amount: GAME.bomb.damage },
    ]);
  });
});

describe('vitamin behavior', () => {
  it('grabbing a vitamin grants the clicker a shield and consumes it, with no mass delta', () => {
    const interaction = getItemBehavior('vitamin').onClick(item('vitamin'), 'p1', EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      massDeltas: [],
      effects: [{ playerId: 'p1', kind: 'shield', durationMs: GAME.vitamin.shieldMs }],
    });
  });

  it('drifting into a vitamin shields the colliding Pokémon the same way', () => {
    const interaction = getItemBehavior('vitamin').onCollide?.(
      item('vitamin'),
      PLAYER,
      EMPTY_STATE,
    );

    expect(interaction).toEqual({
      consumed: true,
      massDeltas: [],
      effects: [{ playerId: 'p1', kind: 'shield', durationMs: GAME.vitamin.shieldMs }],
    });
  });
});

describe('mushroom gamble behavior', () => {
  // gambleDelta(rng) = minDelta + floor(rng * (maxDelta - minDelta + 1)); with [-20, 40] that's -20 + floor(rng * 61).
  const span = GAME.mushroom.maxDelta - GAME.mushroom.minDelta + 1;

  it('a click rolls a delta within range, credits the clicker, and consumes the mushroom', () => {
    const lowest = getItemBehavior('mushroom').onClick(
      item('mushroom'),
      'p1',
      EMPTY_STATE,
      undefined,
      () => 0,
    );
    const highest = getItemBehavior('mushroom').onClick(
      item('mushroom'),
      'p1',
      EMPTY_STATE,
      undefined,
      () => 0.999,
    );

    expect(lowest).toEqual({
      consumed: true,
      massDeltas: [{ playerId: 'p1', amount: GAME.mushroom.minDelta }],
    });
    expect(highest).toEqual({
      consumed: true,
      massDeltas: [{ playerId: 'p1', amount: GAME.mushroom.maxDelta }],
    });
  });

  it('drifting into a mushroom rolls the same way for the colliding Pokémon', () => {
    const interaction = getItemBehavior('mushroom').onCollide?.(
      item('mushroom'),
      PLAYER,
      EMPTY_STATE,
      () => 0.5,
    );

    expect(interaction).toEqual({
      consumed: true,
      massDeltas: [{ playerId: 'p1', amount: GAME.mushroom.minDelta + Math.floor(0.5 * span) }],
    });
  });

  it('every roll lands within [minDelta, maxDelta]', () => {
    for (let i = 0; i < span; i += 1) {
      const rng = (): number => i / span;
      const { amount } = getItemBehavior('mushroom').onClick(
        item('mushroom'),
        'p1',
        EMPTY_STATE,
        undefined,
        rng,
      ).massDeltas[0];

      expect(amount).toBeGreaterThanOrEqual(GAME.mushroom.minDelta);
      expect(amount).toBeLessThanOrEqual(GAME.mushroom.maxDelta);
    }
  });
});
