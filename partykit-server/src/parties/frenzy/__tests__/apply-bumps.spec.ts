import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { HumanPlayer, Player, ServerState } from '@game/frenzy/types';

import { applyBumpDamage } from '../engine/apply-bumps';
import type { BumpDamage } from '../engine/tick/separate-players';
import { TEST_BODY } from './test-body';

function makePlayer(overrides: Partial<HumanPlayer> = {}): Player {
  return {
    kind: 'human',
    id: 'p',
    name: 'P',
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

const BUMP_DAMAGE = FRENZY.playerCollision.bumpDamage;

describe('applyBumpDamage', () => {
  it('is a no-op for an empty bump list', () => {
    const state = stateWith([makePlayer({ id: 'a' })]);
    const result = applyBumpDamage(state, []);

    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('damages each victim and emits a bumped float event per survivor', () => {
    const a = makePlayer({ id: 'a' });
    const b = makePlayer({ id: 'b' });
    const bumps: BumpDamage[] = [
      { playerId: 'a', killerId: 'b' },
      { playerId: 'b', killerId: 'a' },
    ];
    const result = applyBumpDamage(stateWith([a, b]), bumps);

    expect(result.state.players.find((player) => player.id === 'a')?.hp).toBe(100 + BUMP_DAMAGE);
    expect(result.state.players.find((player) => player.id === 'b')?.hp).toBe(100 + BUMP_DAMAGE);
    expect(result.events).toContainEqual({ type: 'bumped', playerId: 'a' });
    expect(result.events).toContainEqual({ type: 'bumped', playerId: 'b' });
  });

  it('reuses applyHpDeltas to faint a victim, naming the rammer, and floats no bump quip for it', () => {
    const frail = makePlayer({ id: 'frail', hp: -BUMP_DAMAGE });
    const result = applyBumpDamage(stateWith([frail]), [{ playerId: 'frail', killerId: 'rammer' }]);

    expect(result.state.players).toHaveLength(0);
    expect(result.events).toContainEqual({
      type: 'fainted',
      playerId: 'frail',
      cause: { by: 'bump', killerId: 'rammer' },
    });
    expect(result.events).not.toContainEqual({ type: 'bumped', playerId: 'frail' });
  });

  it('sums damage but floats once for a victim rammed by two rivals in one tick', () => {
    const victim = makePlayer({ id: 'victim' });
    const bumps: BumpDamage[] = [
      { playerId: 'victim', killerId: 'r1' },
      { playerId: 'victim', killerId: 'r2' },
    ];
    const result = applyBumpDamage(stateWith([victim]), bumps);

    expect(result.state.players[0].hp).toBe(100 + BUMP_DAMAGE * 2);
    expect(result.events.filter((event) => event.type === 'bumped')).toHaveLength(1);
  });
});
