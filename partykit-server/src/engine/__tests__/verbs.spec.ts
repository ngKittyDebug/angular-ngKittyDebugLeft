import { describe, expect, it } from 'vitest';

import type { ItemDefinition } from '@game/engine/definition';
import { FRENZY } from '@game/frenzy/config';
import { FRENZY_EFFECTS, FRENZY_ITEMS } from '@game/frenzy/definition';
import type { Item, ItemType, Player, PlayerEffectKind, ServerState } from '@game/frenzy/types';

import { resolveInteraction } from '../verbs';
import type {
  InteractionContext,
  InteractionTrigger,
  ItemInteraction,
  ItemInteractions,
} from '../verbs';
import { TEST_BODY } from './test-body';

const ITEM_TYPES: ItemType[] = ['food', 'rotten', 'rock', 'rareCandy', 'goldenBerry', 'crumb'];
const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

function item(type: ItemType): Item {
  return { id: 'i1', type, x: 0.5, y: 0.5, vy: FRENZY.fallSpeed[type] };
}

/** Widening lookup — the roster's literal types narrow each item to its own descriptors. */
function interactionsOf(type: ItemType): ItemInteractions {
  const definition: ItemDefinition<PlayerEffectKind> = FRENZY_ITEMS[type];

  return definition.interactions;
}

function resolve(
  type: ItemType,
  trigger: InteractionTrigger,
  context: Partial<InteractionContext> = {},
): ItemInteraction | undefined {
  return resolveInteraction(interactionsOf(type), trigger, {
    item: item(type),
    state: EMPTY_STATE,
    effects: FRENZY_EFFECTS,
    takerId: 'p1',
    ...context,
  });
}

const PLAYER: Player = {
  kind: 'human',
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  body: TEST_BODY,
  stage: 1,
  hp: 100,
  mana: 0,
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
  scores: {},
};

describe('definition wiring', () => {
  const RESOLVED_VERBS = ['eat', 'gamble', 'grantEffect', 'nudge', 'explode'];
  const TRIGGERS: InteractionTrigger[] = ['onClick', 'onCollide', 'onLand'];

  it('every item declares an onClick and only verbs that have a resolver', () => {
    for (const type of Object.keys(FRENZY_ITEMS) as ItemType[]) {
      const interactions = interactionsOf(type);

      expect(interactions.onClick).toBeDefined();

      for (const trigger of TRIGGERS) {
        const spec = interactions[trigger];

        if (spec !== undefined && spec.verb !== 'none') {
          expect(RESOLVED_VERBS).toContain(spec.verb);
        }
      }
    }
  });

  it('taker verbs resolve to nothing on a taker-less trigger (a landing has no eater)', () => {
    expect(resolve('food', 'onClick', { takerId: undefined })).toBeUndefined();
    expect(resolve('mushroom', 'onClick', { takerId: undefined })).toBeUndefined();
    expect(resolve('shield', 'onClick', { takerId: undefined })).toBeUndefined();
  });
});

describe('eat verb', () => {
  it('clicking any plain edible gives the clicker its per-type hp delta and consumes it', () => {
    for (const type of ITEM_TYPES) {
      const interaction = resolve(type, 'onClick');

      expect(interaction?.consumed).toBe(true);
      expect(interaction?.hpDeltas).toEqual([
        { playerId: 'p1', amount: FRENZY.itemEffects[type], source: 'item' },
      ]);
    }
  });

  it('plain edibles have no landing verb (they rest on the seabed instead)', () => {
    for (const type of ITEM_TYPES) {
      expect(interactionsOf(type).onLand).toBeUndefined();
    }
  });

  it('drifting into edible items (food, rareCandy, rotten, goldenBerry, crumb) applies their hp delta like a click', () => {
    for (const type of ['food', 'rareCandy', 'rotten', 'goldenBerry', 'crumb'] as ItemType[]) {
      const interaction = resolve(type, 'onCollide');

      expect(interaction).toEqual({
        consumed: true,
        hpDeltas: [{ playerId: 'p1', amount: FRENZY.itemEffects[type], source: 'item' }],
      });
    }
  });

  it('a rock collision damages the player and consumes the rock', () => {
    expect(resolve('rock', 'onCollide')).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.collision.rockDamage, source: 'item' }],
    });
  });

  it('a brick collision damages the player twice as hard as a rock and consumes the brick', () => {
    expect(resolve('brick', 'onCollide')).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.collision.brickDamage, source: 'item' }],
    });
    expect(FRENZY.collision.brickDamage).toBe(FRENZY.collision.rockDamage * 2);
  });

  it('drifting into rotten poisons the player (its negative hp delta) and consumes it', () => {
    expect(resolve('rotten', 'onCollide')).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.itemEffects.rotten, source: 'item' }],
    });
  });
});

describe('nudge + explode verbs (bomb)', () => {
  // y = 1: the bomb explodes once it reaches the floor, so blast tests place it there.
  function bombAt(x: number): Item {
    return { ...item('bomb'), x, y: 1 };
  }

  function playerAt(id: string, x: number, y: number, status: Player['status'] = 'alive'): Player {
    return { ...PLAYER, id, x, y, status };
  }

  function bombResolve(
    trigger: InteractionTrigger,
    bomb: Item,
    state: ServerState,
    context: Partial<InteractionContext> = {},
  ): ItemInteraction | undefined {
    return resolveInteraction(interactionsOf('bomb'), trigger, {
      item: bomb,
      state,
      effects: FRENZY_EFFECTS,
      ...context,
    });
  }

  it('a click shoves the bomb opposite the tapped side and never eats it', () => {
    // A horizontal-left direction → a purely leftward impulse of magnitude clickImpulse.
    const interaction = bombResolve('onClick', bombAt(0.5), EMPTY_STATE, {
      takerId: 'p1',
      nudgeX: -0.1,
    });

    expect(interaction).toEqual({
      hpDeltas: [],
      consumed: false,
      nudgeX: -FRENZY.bomb.clickImpulse,
      nudgeY: 0,
    });
  });

  it('shoves vertically too — tapping above the centre pushes the bomb down', () => {
    // nudgeY > 0 is downward in scene space; the bomb gets a purely vertical impulse, no horizontal component.
    const interaction = bombResolve('onClick', bombAt(0.5), EMPTY_STATE, {
      takerId: 'p1',
      nudgeX: 0,
      nudgeY: 1,
    });

    expect(interaction?.nudgeX).toBe(0);
    expect(interaction?.nudgeY).toBe(FRENZY.bomb.clickImpulse);
  });

  it('normalizes the client direction to a fixed clickImpulse magnitude (never the raw size)', () => {
    const diagonal = bombResolve('onClick', bombAt(0.5), EMPTY_STATE, {
      takerId: 'p1',
      nudgeX: 5,
      nudgeY: 5,
    });

    // A (5,5) input is a 45° push; magnitude is always clickImpulse regardless of the raw values.
    expect(Math.hypot(diagonal?.nudgeX ?? 0, diagonal?.nudgeY ?? 0)).toBeCloseTo(
      FRENZY.bomb.clickImpulse,
      5,
    );
    expect(diagonal?.nudgeX).toBeCloseTo(diagonal?.nudgeY ?? 0, 5); // symmetric 45°
  });

  it('without a direction, a click shoves the bomb away from the nearest edge (fallback)', () => {
    const fromLeft = bombResolve('onClick', bombAt(0.3), EMPTY_STATE, { takerId: 'p1' });
    const fromRight = bombResolve('onClick', bombAt(0.7), EMPTY_STATE, { takerId: 'p1' });

    expect(fromLeft?.nudgeX).toBe(FRENZY.bomb.clickImpulse);
    expect(fromLeft?.nudgeY).toBe(0);
    expect(fromRight?.nudgeX).toBe(-FRENZY.bomb.clickImpulse);
  });

  it('with click budget to spare, a click still just nudges (no detonation)', () => {
    const armed: Item = { ...bombAt(0.5), clicksLeft: 3 };

    const interaction = bombResolve('onClick', armed, EMPTY_STATE, {
      takerId: 'p1',
      nudgeX: -0.1,
    });

    expect(interaction?.explodes).toBeUndefined();
    expect(interaction?.consumed).toBe(false);
    expect(interaction?.nudgeX).toBe(-FRENZY.bomb.clickImpulse);
  });

  it('detonates when the click spends the last budget (clicksLeft <= 1)', () => {
    const victim = playerAt('victim', 0.5, 1);
    const state: ServerState = { players: [victim], items: [], tick: 0 };
    const lastClick: Item = { ...bombAt(0.5), clicksLeft: 1 };

    const interaction = bombResolve('onClick', lastClick, state, { takerId: 'p1', nudgeX: -0.1 });

    expect(interaction?.explodes).toEqual({ radius: FRENZY.bomb.blastRadius });
    expect(interaction?.consumed).toBe(true);
    expect(interaction?.hpDeltas.map((delta) => delta.playerId)).toEqual(['victim']);
  });

  it('never click-detonates an aura-emitted bomb (no clicksLeft) — always nudges', () => {
    const interaction = bombResolve('onClick', bombAt(0.5), EMPTY_STATE, {
      takerId: 'p1',
      nudgeX: -0.1,
    });

    expect(interaction?.explodes).toBeUndefined();
    expect(interaction?.consumed).toBe(false);
  });

  it('explodes on landing and damages every alive player in range, owner included; far/offline spared', () => {
    const owner = playerAt('owner', 0.5, 1);
    const nearby = playerAt('near', 0.6, 0.95);
    const faraway = playerAt('far', 0.1, 0.5);
    const offline = playerAt('offline', 0.5, 1, 'disconnected');
    const state: ServerState = {
      players: [owner, nearby, faraway, offline],
      items: [],
      tick: 0,
    };

    const interaction = bombResolve('onLand', bombAt(0.5), state);

    expect(interaction?.consumed).toBe(true);
    expect(interaction?.explodes).toEqual({ radius: FRENZY.bomb.blastRadius });
    expect(interaction?.hpDeltas.map((delta) => delta.playerId)).toEqual(['owner', 'near']);
    // Epicentre takes the full max; the off-centre one takes less (distance falloff) but never weaker than the floor.
    expect(interaction?.hpDeltas[0].amount).toBe(FRENZY.bomb.maxDamage);
    expect(interaction?.hpDeltas[1].amount).toBeGreaterThan(FRENZY.bomb.maxDamage);
    expect(interaction?.hpDeltas[1].amount).toBeLessThanOrEqual(FRENZY.bomb.minDamage);
  });

  it('kicks each caught player radially away from the epicentre (one impulse per hit)', () => {
    const owner = playerAt('owner', 0.5, 1); // exactly on the bomb → lifted straight up
    const side = playerAt('side', 0.6, 1); // to the right → pushed right
    const state: ServerState = { players: [owner, side], items: [], tick: 0 };

    const interaction = bombResolve('onLand', bombAt(0.5), state);

    expect(interaction?.impulses).toHaveLength(2);

    const ownerImpulse = interaction?.impulses?.find((impulse) => impulse.playerId === 'owner');
    const sideImpulse = interaction?.impulses?.find((impulse) => impulse.playerId === 'side');

    expect(ownerImpulse?.ix).toBe(0);
    expect(ownerImpulse?.iy).toBeLessThan(0); // straight up out of the epicentre
    expect(sideImpulse?.ix).toBeGreaterThan(0); // flung away to the right
  });

  it('spares a blast-warded (shielded) player from the blast (skipped, not zero-damage)', () => {
    const owner = playerAt('owner', 0.5, 1);
    const shielded: Player = {
      ...playerAt('shielded', 0.55, 1),
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    };
    const state: ServerState = { players: [owner, shielded], items: [], tick: 0 };

    const interaction = bombResolve('onLand', bombAt(0.5), state);

    expect(interaction?.hpDeltas).toEqual([
      { playerId: 'owner', amount: FRENZY.bomb.maxDamage, source: 'blast' },
    ]);
  });

  it('spares the bomb owner from their own laid bomb but still hits nearby rivals', () => {
    const layer = playerAt('layer', 0.5, 1);
    const rival = playerAt('rival', 0.55, 1);
    const ownedBomb: Item = { ...bombAt(0.5), ownerId: 'layer' };
    const state: ServerState = { players: [layer, rival], items: [], tick: 0 };

    const interaction = bombResolve('onLand', ownedBomb, state);

    expect(interaction?.hpDeltas).toHaveLength(1);
    expect(interaction?.hpDeltas[0].playerId).toBe('rival');
    expect(interaction?.hpDeltas[0].amount).toBeLessThan(0);
  });

  it('also detonates on mid-air collision — same area blast, closer hit takes more damage', () => {
    const touched = playerAt('touched', 0.5, 0.6);
    const bystander = playerAt('bystander', 0.6, 0.6);
    const faraway = playerAt('far', 0.1, 0.6);
    const state: ServerState = { players: [touched, bystander, faraway], items: [], tick: 0 };

    const interaction = bombResolve('onCollide', { ...item('bomb'), x: 0.5, y: 0.6 }, state, {
      takerId: 'touched',
    });

    expect(interaction?.consumed).toBe(true);
    expect(interaction?.explodes).toEqual({ radius: FRENZY.bomb.blastRadius });
    expect(interaction?.hpDeltas.map((delta) => delta.playerId)).toEqual(['touched', 'bystander']);
    // touched sits at the epicentre, bystander off to the side → touched loses more (a more negative amount).
    expect(interaction?.hpDeltas[0].amount).toBeLessThan(interaction?.hpDeltas[1].amount ?? 0);
  });
});

describe('grantEffect verb', () => {
  it('grabbing a vitamin heals its hp and grants wellFed (decay pause), consuming it', () => {
    expect(resolve('vitamin', 'onClick')).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.vitamin.hp, source: 'item' }],
      effects: [{ playerId: 'p1', kind: 'wellFed', durationMs: FRENZY.vitamin.decayPauseMs }],
    });
  });

  it('drifting into a vitamin heals and grants wellFed the same way', () => {
    expect(resolve('vitamin', 'onCollide')).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.vitamin.hp, source: 'item' }],
      effects: [{ playerId: 'p1', kind: 'wellFed', durationMs: FRENZY.vitamin.decayPauseMs }],
    });
  });

  it('a shield grants the ward with NO hp delta, consuming it (click and collide alike)', () => {
    const expected = {
      consumed: true,
      hpDeltas: [],
      effects: [{ playerId: 'p1', kind: 'shield', durationMs: FRENZY.shield.shieldMs }],
    };

    expect(resolve('shield', 'onClick')).toEqual(expected);
    expect(resolve('shield', 'onCollide')).toEqual(expected);
  });

  it('an easter egg heals its hp and grants the laying aura', () => {
    const expected = {
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.easterEgg.hpOnPickup, source: 'item' }],
      effects: [{ playerId: 'p1', kind: 'laying', durationMs: FRENZY.easterEgg.durationMs }],
    };

    expect(resolve('easterEgg', 'onClick')).toEqual(expected);
    expect(resolve('easterEgg', 'onCollide')).toEqual(expected);
  });

  it('a poop deals its negative pickup hit and grants the pooping aura', () => {
    const expected = {
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.poop.hpOnPickup, source: 'item' }],
      effects: [{ playerId: 'p1', kind: 'pooping', durationMs: FRENZY.poop.durationMs }],
    };

    expect(resolve('poop', 'onClick')).toEqual(expected);
    expect(resolve('poop', 'onCollide')).toEqual(expected);
  });
});

describe('gamble verb (mushroom)', () => {
  // amount = minDelta + floor(rng * (maxDelta - minDelta + 1)); with [-20, 40] that's -20 + floor(rng * 61).
  const span = FRENZY.mushroom.maxDelta - FRENZY.mushroom.minDelta + 1;

  it('a click rolls a delta within range, credits the clicker, and consumes the mushroom', () => {
    const lowest = resolve('mushroom', 'onClick', { rng: () => 0 });
    const highest = resolve('mushroom', 'onClick', { rng: () => 0.999 });

    expect(lowest).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.mushroom.minDelta, source: 'item' }],
    });
    expect(highest).toEqual({
      consumed: true,
      hpDeltas: [{ playerId: 'p1', amount: FRENZY.mushroom.maxDelta, source: 'item' }],
    });
  });

  it('drifting into a mushroom rolls the same way for the colliding player', () => {
    expect(resolve('mushroom', 'onCollide', { rng: () => 0.5 })).toEqual({
      consumed: true,
      hpDeltas: [
        {
          playerId: 'p1',
          amount: FRENZY.mushroom.minDelta + Math.floor(0.5 * span),
          source: 'item',
        },
      ],
    });
  });

  it('every roll lands within [minDelta, maxDelta]', () => {
    for (let i = 0; i < span; i += 1) {
      const interaction = resolve('mushroom', 'onClick', { rng: () => i / span });
      const amount = interaction?.hpDeltas[0].amount ?? Number.NaN;

      expect(amount).toBeGreaterThanOrEqual(FRENZY.mushroom.minDelta);
      expect(amount).toBeLessThanOrEqual(FRENZY.mushroom.maxDelta);
    }
  });
});
