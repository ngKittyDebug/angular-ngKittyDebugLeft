import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { describe, expect, it } from 'vitest';

import type { DetonatedEvent, HumanPlayer, Item, Player, ServerState } from '@game/frenzy/types';

import { resolveLandings } from '../core/tick/resolve-landings';
import { TEST_BODY } from './test-body';

const BLAST_RADIUS = FRENZY_DEFINITION.items.bomb.interactions.onLand.blastRadius;

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

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('resolveLandings', () => {
  it('detonates an explosive that reached the floor over the whole blast area', () => {
    // Two players inside the bomb's blast radius of its landing spot.
    const state = stateWith([
      player({ id: 'near', x: 0.5, y: 0.95 }),
      player({ id: 'alsoNear', x: 0.52, y: 0.95 }),
    ]);
    const bomb: Item = { id: 'bomb-1', type: 'bomb', x: 0.5, y: 0.96, vy: 0 };

    const { events } = resolveLandings(FRENZY_DEFINITION, state, [bomb]);
    const detonatedEvent = events.find(
      (event): event is DetonatedEvent => event.type === 'detonated',
    );

    expect(detonatedEvent).toMatchObject({ itemId: 'bomb-1', radius: BLAST_RADIUS });
    expect(detonatedEvent?.hits.length).toBeGreaterThan(0);
  });

  it('applies the landing blast hp deltas to players in range', () => {
    const state = stateWith([player({ id: 'victim', x: 0.5, y: 0.96, hp: 100 })]);
    const bomb: Item = { id: 'bomb-1', type: 'bomb', x: 0.5, y: 0.96, vy: 0 };

    const { state: next } = resolveLandings(FRENZY_DEFINITION, state, [bomb]);

    expect(next.players[0].hp).toBeLessThan(100);
  });

  it('leaves the field untouched for a landed item with no onLand verb', () => {
    const state = stateWith([player({ x: 0.5, y: 0.96 })]);
    const food: Item = { id: 'food-1', type: 'food', x: 0.5, y: 0.96, vy: 0 };

    const result = resolveLandings(FRENZY_DEFINITION, state, [food]);

    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('emits no events when no expired items reached the floor this tick', () => {
    const state = stateWith([player()]);

    const result = resolveLandings(FRENZY_DEFINITION, state, []);

    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('faints a player whose remaining hp cannot absorb the landing blast', () => {
    const state = stateWith([player({ id: 'frail', x: 0.5, y: 0.96, hp: 3 })]);
    const bomb: Item = { id: 'bomb-1', type: 'bomb', x: 0.5, y: 0.96, vy: 0 };

    const { state: next, events } = resolveLandings(FRENZY_DEFINITION, state, [bomb]);

    expect(next.players).toHaveLength(0);
    expect(events).toContainEqual({
      type: 'fainted',
      playerId: 'frail',
      cause: { by: 'item', itemType: 'bomb' },
    });
  });
});
