import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { describe, expect, it } from 'vitest';

import type {
  DetonatedEvent,
  EatenEvent,
  EffectGrantedEvent,
  HumanPlayer,
  Item,
  Player,
  ServerState,
} from '@game/frenzy/types';

import { resolveCollisions } from '../core/tick/resolve-collisions';
import { TEST_BODY } from './test-body';

const NOW = 1_000_000;
const rng = (): number => 0.5;

function player(overrides: Partial<HumanPlayer> = {}): Player {
  return {
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
    ...overrides,
  };
}

function stateWith(players: Player[], items: Item[]): ServerState {
  return { players, items, tick: 0 };
}

/** An item overlapping the player at (0.5, 0.5) — same point guarantees an AABB hit for any stage body. */
function itemOn(type: Item['type'], overrides: Partial<Item> = {}): Item {
  return { id: `${type}-1`, type, x: 0.5, y: 0.5, vy: 0, ...overrides };
}

describe('resolveCollisions', () => {
  it('eats plain food a drifting player overlaps, healing it and reporting eaten via collision', () => {
    const state = stateWith([player({ hp: 100 })], [itemOn('food')]);

    const { state: next, events } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);
    const eaten = events.find((event): event is EatenEvent => event.type === 'eaten');

    expect(next.players[0].hp).toBe(110);
    expect(eaten).toMatchObject({
      itemType: 'food',
      playerId: 'p1',
      delta: 10,
      newHp: 110,
      via: 'collision',
    });
  });

  it('removes a consumed item from the returned state', () => {
    const state = stateWith([player()], [itemOn('food')]);

    const { state: next } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);

    expect(next.items).toHaveLength(0);
  });

  it('grants the timed effect (not an eaten) when a player drifts into an effect pickup', () => {
    const state = stateWith([player({ hp: 100, effects: [] })], [itemOn('vitamin')]);

    const { state: next, events } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);
    const granted = events.find(
      (event): event is EffectGrantedEvent => event.type === 'effectGranted',
    );

    expect(events.some((event) => event.type === 'eaten')).toBe(false);
    expect(granted).toMatchObject({ playerId: 'p1', via: 'collision', itemId: 'vitamin-1' });
    expect(granted?.effect.kind).toBe('wellFed');
    expect(next.players[0].effects.map((effect) => effect.kind)).toContain('wellFed');
  });

  it('applies the heal that rides along with an effect pickup', () => {
    const state = stateWith([player({ hp: 100 })], [itemOn('vitamin')]);

    const { state: next } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);

    expect(next.players[0].hp).toBe(120);
  });

  it('detonates an explosive that bumps a player instead of eating it one-on-one', () => {
    const state = stateWith([player({ hp: 100 })], [itemOn('bomb')]);

    const { events } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);
    const detonatedEvent = events.find(
      (event): event is DetonatedEvent => event.type === 'detonated',
    );

    expect(events.some((event) => event.type === 'eaten')).toBe(false);
    expect(detonatedEvent).toMatchObject({ itemId: 'bomb-1' });
    expect(detonatedEvent?.radius).toBe(
      FRENZY_DEFINITION.items.bomb.interactions.onCollide.blastRadius,
    );
  });

  it('reports the negative delta when a harmful faller (rock) bonks a player on contact', () => {
    const state = stateWith([player({ hp: 100 })], [itemOn('rock')]);

    const { state: next, events } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);
    const eaten = events.find((event): event is EatenEvent => event.type === 'eaten');

    expect(next.players[0].hp).toBe(85);
    expect(eaten).toMatchObject({ itemType: 'rock', delta: -15, newHp: 85 });
  });

  it('ignores an item that overlaps no player (no collision target in reach)', () => {
    const state = stateWith([player({ x: 0.1, y: 0.1 })], [itemOn('food', { x: 0.9, y: 0.9 })]);

    const result = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);

    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('skips a dead (fainted) collision: a lethal bomb removes the player and reports the faint', () => {
    const state = stateWith([player({ id: 'frail', hp: 3 })], [itemOn('bomb')]);

    const { state: next, events } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);

    expect(next.players).toHaveLength(0);
    expect(events).toContainEqual({
      type: 'fainted',
      playerId: 'frail',
      cause: { by: 'item', itemType: 'bomb' },
    });
  });

  it('spares an emitting owner from its own un-armed item (owner-immunity)', () => {
    const owner = player({ id: 'owner', hp: 100 });
    const emitted = itemOn('food', { id: 'emit-1', ownerId: 'owner' });
    const state = stateWith([owner], [emitted]);

    const { state: next } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);

    expect(next.players[0].hp).toBe(100);
    expect(next.items).toHaveLength(1);
  });

  it('lets an armed emitted item strike its own emitter once it has separated', () => {
    const owner = player({ id: 'owner', hp: 100 });
    const emitted = itemOn('food', { id: 'emit-1', ownerId: 'owner', armed: true });
    const state = stateWith([owner], [emitted]);

    const { state: next } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);

    expect(next.players[0].hp).toBe(110);
  });

  it('resolves the item against the closest of several overlapping players', () => {
    const near = player({ id: 'near', x: 0.5, y: 0.5, hp: 100 });
    const far = player({ id: 'far', x: 0.51, y: 0.5, hp: 100 });
    const state = stateWith([near, far], [itemOn('food', { x: 0.5, y: 0.5 })]);

    const { events } = resolveCollisions(FRENZY_DEFINITION, state, rng, NOW);
    const eaten = events.find((event): event is EatenEvent => event.type === 'eaten');

    expect(eaten?.playerId).toBe('near');
  });
});
