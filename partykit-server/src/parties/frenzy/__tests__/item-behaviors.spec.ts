import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { Item, ItemType, Player, ServerState } from '@game/frenzy/types';

import { getItemBehavior } from '../engine/item-behaviors';
import { TEST_BODY } from './test-body';

const ITEM_TYPES: ItemType[] = ['food', 'rotten', 'rock', 'rareCandy', 'goldenBerry', 'crumb'];
const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

function item(type: ItemType): Item {
  return { id: 'i1', type, x: 0.5, y: 0.5, vy: FRENZY.fallSpeed[type] };
}

const PLAYER: Player = {
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  body: TEST_BODY,
  stage: 1,
  hp: 100,
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
  it('grabbing any item gives the clicker its per-type hp delta and consumes it', () => {
    for (const type of ITEM_TYPES) {
      const interaction = getItemBehavior(type).onClick(item(type), 'p1', EMPTY_STATE);

      expect(interaction.consumed).toBe(true);
      expect(interaction.hpDeltas).toEqual([{ playerId: 'p1', amount: FRENZY.itemEffects[type] }]);
    }
  });

  it('current items have no landing behavior', () => {
    for (const type of ITEM_TYPES) {
      expect(getItemBehavior(type).onLand).toBeUndefined();
    }
  });

  it('drifting into edible items (food, rareCandy, rotten, goldenBerry, crumb) applies their hp delta like a click', () => {
    for (const type of ['food', 'rareCandy', 'rotten', 'goldenBerry', 'crumb'] as ItemType[]) {
      const interaction = getItemBehavior(type).onCollide?.(item(type), PLAYER, EMPTY_STATE);

      expect(interaction).toEqual({
        consumed: true,
        hpDeltas: [{ playerId: 'p1', amount: FRENZY.itemEffects[type] }],
      });
    }
  });

  it('a rock collision damages the Pokémon and consumes the rock', () => {
    const interaction = getItemBehavior('rock').onCollide?.(item('rock'), PLAYER, EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.collision.rockDamage }],
    });
  });

  it('a brick collision damages the Pokémon twice as hard as a rock and consumes the brick', () => {
    const interaction = getItemBehavior('brick').onCollide?.(item('brick'), PLAYER, EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.collision.brickDamage }],
    });
    expect(FRENZY.collision.brickDamage).toBe(FRENZY.collision.rockDamage * 2);
  });

  it('drifting into rotten poisons the Pokémon (its negative hp delta) and consumes it', () => {
    const interaction = getItemBehavior('rotten').onCollide?.(item('rotten'), PLAYER, EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.itemEffects.rotten }],
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

    expect(interaction).toEqual({ hpDeltas: [], consumed: false, nudgeX: -0.1 });
  });

  it('caps an oversized bat displacement', () => {
    const interaction = getItemBehavior('bomb').onClick(bombAt(0.5), 'p1', EMPTY_STATE, 1);

    expect(interaction.nudgeX).toBe(FRENZY.bomb.maxNudge);
  });

  it('without a displacement, a click bats the bomb away from the nearest edge (fallback)', () => {
    const fromLeft = getItemBehavior('bomb').onClick(bombAt(0.3), 'p1', EMPTY_STATE);
    const fromRight = getItemBehavior('bomb').onClick(bombAt(0.7), 'p1', EMPTY_STATE);

    expect(fromLeft.nudgeX).toBe(FRENZY.bomb.nudgeStep);
    expect(fromRight.nudgeX).toBe(-FRENZY.bomb.nudgeStep);
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
    expect(interaction?.hpDeltas).toEqual([
      { playerId: 'owner', amount: FRENZY.bomb.damage },
      { playerId: 'near', amount: FRENZY.bomb.damage },
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

    expect(interaction?.hpDeltas).toEqual([{ playerId: 'owner', amount: FRENZY.bomb.damage }]);
  });

  it('spares the bomb owner from their own laid bomb but still hits nearby rivals', () => {
    const layer = playerAt('layer', 0.5, 1);
    const rival = playerAt('rival', 0.55, 1);
    const ownedBomb: Item = { ...bombAt(0.5), ownerId: 'layer' };
    const state: ServerState = { players: [layer, rival], items: [], tick: 0 };

    const interaction = getItemBehavior('bomb').onLand?.(ownedBomb, state);

    expect(interaction?.hpDeltas).toEqual([{ playerId: 'rival', amount: FRENZY.bomb.damage }]);
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
    expect(interaction?.hpDeltas).toEqual([
      { playerId: 'touched', amount: FRENZY.bomb.damage },
      { playerId: 'bystander', amount: FRENZY.bomb.damage },
    ]);
  });
});

describe('vitamin behavior', () => {
  it('grabbing a vitamin heals its hp and grants wellFed (decay pause), consuming it', () => {
    const interaction = getItemBehavior('vitamin').onClick(item('vitamin'), 'p1', EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.vitamin.hp }],
      effects: [{ playerId: 'p1', kind: 'wellFed', durationMs: FRENZY.vitamin.decayPauseMs }],
    });
  });

  it('drifting into a vitamin heals and grants wellFed the same way', () => {
    const interaction = getItemBehavior('vitamin').onCollide?.(
      item('vitamin'),
      PLAYER,
      EMPTY_STATE,
    );

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.vitamin.hp }],
      effects: [{ playerId: 'p1', kind: 'wellFed', durationMs: FRENZY.vitamin.decayPauseMs }],
    });
  });
});

describe('shield behavior', () => {
  it('grabbing a shield grants the clicker the shield ward and consumes it, with no hp delta', () => {
    const interaction = getItemBehavior('shield').onClick(item('shield'), 'p1', EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [],
      effects: [{ playerId: 'p1', kind: 'shield', durationMs: FRENZY.shield.shieldMs }],
    });
  });

  it('drifting into a shield wards the colliding Pokémon the same way', () => {
    const interaction = getItemBehavior('shield').onCollide?.(item('shield'), PLAYER, EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [],
      effects: [{ playerId: 'p1', kind: 'shield', durationMs: FRENZY.shield.shieldMs }],
    });
  });
});

describe('mushroom gamble behavior', () => {
  // gambleDelta(rng) = minDelta + floor(rng * (maxDelta - minDelta + 1)); with [-20, 40] that's -20 + floor(rng * 61).
  const span = FRENZY.mushroom.maxDelta - FRENZY.mushroom.minDelta + 1;

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
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.mushroom.minDelta }],
    });
    expect(highest).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.mushroom.maxDelta }],
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
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.mushroom.minDelta + Math.floor(0.5 * span) }],
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
      ).hpDeltas[0];

      expect(amount).toBeGreaterThanOrEqual(FRENZY.mushroom.minDelta);
      expect(amount).toBeLessThanOrEqual(FRENZY.mushroom.maxDelta);
    }
  });
});

describe('easter egg behavior', () => {
  it('grabbing an easter egg heals its hp and grants the laying aura, consuming it', () => {
    const interaction = getItemBehavior('easterEgg').onClick(item('easterEgg'), 'p1', EMPTY_STATE);

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.easterEgg.hpOnPickup }],
      effects: [{ playerId: 'p1', kind: 'laying', durationMs: FRENZY.easterEgg.durationMs }],
    });
  });

  it('drifting into an easter egg heals and grants the laying aura the same way', () => {
    const interaction = getItemBehavior('easterEgg').onCollide?.(
      item('easterEgg'),
      PLAYER,
      EMPTY_STATE,
    );

    expect(interaction).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.easterEgg.hpOnPickup }],
      effects: [{ playerId: 'p1', kind: 'laying', durationMs: FRENZY.easterEgg.durationMs }],
    });
  });
});
