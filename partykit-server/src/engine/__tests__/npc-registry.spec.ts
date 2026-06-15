import { describe, expect, it } from 'vitest';

import type { NpcPlayer, Player, ServerState } from '@game/engine/types';

import { npcHooksFromRegistry } from '../npc/registry';
import type { NpcRuntime } from '../npc/types';
import { TEST_BODY } from './test-body';

type Kind = 'alpha' | 'beta';

function npc(id: string, npcKind: Kind, mana = 10): NpcPlayer<string, Kind> {
  return {
    kind: 'npc',
    npcKind,
    id,
    name: npcKind,
    appearance: npcKind,
    body: TEST_BODY,
    stage: 1,
    hp: 50,
    mana,
    x: 0.5,
    y: 0.9,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

function human(id: string): Player<string, Kind> {
  return {
    kind: 'human',
    id,
    name: 'Ash',
    appearance: 'caterpie',
    body: TEST_BODY,
    stage: 1,
    hp: 100,
    mana: 7,
    x: 0.3,
    y: 0.6,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

/** A runtime that stamps its kind into every hook outcome, so dispatch and ordering are observable. */
function stampingRuntime(stamp: Kind): NpcRuntime<string, string, Kind> {
  return {
    move: (target) => ({ ...target, x: target.x + (stamp === 'alpha' ? 0.1 : 0.2) }),
    applyBlasts: (state) => ({
      state,
      events: [{ type: 'fainted', playerId: `blast-${stamp}` }],
    }),
    coolAnger: (target) => ({ ...target, mana: target.mana - (stamp === 'alpha' ? 1 : 2) }),
  };
}

describe('npcHooksFromRegistry', () => {
  it('dispatches move/coolAnger per npcKind and leaves an unregistered kind untouched', () => {
    const hooks = npcHooksFromRegistry<string, string, Kind>({ alpha: stampingRuntime('alpha') });
    const registered = npc('n1', 'alpha');
    const unregistered = npc('n2', 'beta');

    const moved = hooks.move([registered, unregistered], [], 0.1, 0);

    expect(moved[0].x).toBeCloseTo(0.6, 5);
    // An unregistered kind passes through by reference — inert by default, exactly like the empty registry.
    expect(moved[1]).toBe(unregistered);

    const cooled = hooks.coolAnger([registered, unregistered]);

    expect(cooled[0].mana).toBe(9);
    expect(cooled[1]).toBe(unregistered);
  });

  it('leaves humans untouched in coolAnger (only NPCs are dispatched)', () => {
    const hooks = npcHooksFromRegistry<string, string, Kind>({ alpha: stampingRuntime('alpha') });
    const person = human('p1');

    const cooled = hooks.coolAnger([person, npc('n1', 'alpha')]);

    expect(cooled[0]).toBe(person);
    expect(cooled[1].mana).toBe(9);
  });

  it('chains applyBlasts across kinds in registration order', () => {
    const hooks = npcHooksFromRegistry<string, string, Kind>({
      alpha: stampingRuntime('alpha'),
      beta: stampingRuntime('beta'),
    });
    const state: ServerState<string, string, Kind> = { players: [], items: [], tick: 0 };

    const { events } = hooks.applyBlasts(state);

    expect(events.map((event) => (event.type === 'fainted' ? event.playerId : ''))).toEqual([
      'blast-alpha',
      'blast-beta',
    ]);
  });

  it('is fully inert with an empty registry', () => {
    const hooks = npcHooksFromRegistry<string, string, Kind>({});
    const lone = npc('n1', 'alpha');
    const state: ServerState<string, string, Kind> = { players: [lone], items: [], tick: 0 };

    expect(hooks.move([lone], [], 0.1, 0)[0]).toBe(lone);
    expect(hooks.applyBlasts(state)).toEqual({ state, events: [] });
    expect(hooks.coolAnger([lone])[0]).toBe(lone);
  });
});
