import { describe, expect, it } from 'vitest';

import type { Player, ServerState } from '@game/frenzy/types';

import { applyEffects, resolveGrants } from '../engine/apply-effect';
import { TEST_BODY } from './test-body';

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
  scores: {},
};

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

describe('resolveGrants', () => {
  it('turns a duration into an absolute expiry against now', () => {
    const applications = resolveGrants(
      [{ playerId: 'p1', kind: 'shield', durationMs: 5000 }],
      1000,
    );

    expect(applications).toEqual([{ playerId: 'p1', effect: { kind: 'shield', expiresAt: 6000 } }]);
  });
});

describe('applyEffects', () => {
  it('returns the same state when there are no applications', () => {
    const state = stateWith([PLAYER]);

    expect(applyEffects(state, [])).toBe(state);
  });

  it('adds an effect to the targeted player and leaves others untouched', () => {
    const other: Player = { ...PLAYER, id: 'p2' };
    const next = applyEffects(stateWith([PLAYER, other]), [
      { playerId: 'p1', effect: { kind: 'shield', expiresAt: 6000 } },
    ]);

    expect(next.players[0].effects).toEqual([{ kind: 'shield', expiresAt: 6000 }]);
    expect(next.players[1].effects).toEqual([]);
  });

  it('refreshes an existing effect of the same kind rather than stacking it', () => {
    const shielded: Player = { ...PLAYER, effects: [{ kind: 'shield', expiresAt: 6000 }] };
    const next = applyEffects(stateWith([shielded]), [
      { playerId: 'p1', effect: { kind: 'shield', expiresAt: 9000 } },
    ]);

    expect(next.players[0].effects).toEqual([{ kind: 'shield', expiresAt: 9000 }]);
  });

  it('clears the opposite emit aura — laying and pooping never coexist', () => {
    const laying: Player = { ...PLAYER, effects: [{ kind: 'laying', expiresAt: 6000 }] };
    const next = applyEffects(stateWith([laying]), [
      { playerId: 'p1', effect: { kind: 'pooping', expiresAt: 9000 } },
    ]);

    expect(next.players[0].effects).toEqual([{ kind: 'pooping', expiresAt: 9000 }]);
  });

  it('clears the opposite aura but keeps unrelated effects (shield survives a laying grant)', () => {
    const mixed: Player = {
      ...PLAYER,
      effects: [
        { kind: 'shield', expiresAt: 6000 },
        { kind: 'pooping', expiresAt: 6000 },
      ],
    };
    const next = applyEffects(stateWith([mixed]), [
      { playerId: 'p1', effect: { kind: 'laying', expiresAt: 9000 } },
    ]);

    expect(next.players[0].effects).toEqual([
      { kind: 'shield', expiresAt: 6000 },
      { kind: 'laying', expiresAt: 9000 },
    ]);
  });
});
