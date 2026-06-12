import { describe, expect, it } from 'vitest';

import { FRENZY, totalScore } from '@game/frenzy/config';
import { crownIdOf } from '@game/frenzy/crown';
import type { FaintedEvent, HumanPlayer, Player } from '@game/frenzy/types';

import { applyKills, projectTimeAlive } from '../engine/apply-scores';
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

const bumpFaint = (playerId: string, killerId: string): FaintedEvent => ({
  type: 'fainted',
  playerId,
  cause: { by: 'bump', killerId },
});

describe('crownIdOf', () => {
  it('returns the alive player with the highest hp', () => {
    const players = [
      makePlayer({ id: 'a', hp: 100 }),
      makePlayer({ id: 'b', hp: 300 }),
      makePlayer({ id: 'c', hp: 200 }),
    ];

    expect(crownIdOf(players)).toBe('b');
  });

  it('breaks ties by id so the crown does not flip between equal-hp players', () => {
    const players = [makePlayer({ id: 'z', hp: 300 }), makePlayer({ id: 'a', hp: 300 })];

    expect(crownIdOf(players)).toBe('a');
  });

  it('ignores disconnected players', () => {
    const players = [
      makePlayer({ id: 'a', hp: 100 }),
      makePlayer({ id: 'b', hp: 500, status: 'disconnected' }),
    ];

    expect(crownIdOf(players)).toBe('a');
  });

  it('returns null when nobody is alive', () => {
    expect(crownIdOf([])).toBeNull();
    expect(crownIdOf([makePlayer({ id: 'a', status: 'disconnected' })])).toBeNull();
  });
});

describe('applyKills', () => {
  it('credits +1 kills to the killer named on a fainted event', () => {
    const players = [makePlayer({ id: 'killer' }), makePlayer({ id: 'bystander' })];
    const next = applyKills(players, [bumpFaint('victim', 'killer')], null);

    expect(next.find((player) => player.id === 'killer')?.scores).toEqual({
      kills: 1,
      crownKills: 0,
    });
    expect(next.find((player) => player.id === 'bystander')?.scores).toEqual({});
  });

  it('adds a crownKills bonus when the victim wore the crown', () => {
    const players = [makePlayer({ id: 'killer' })];
    const next = applyKills(players, [bumpFaint('crown', 'killer')], 'crown');

    expect(next[0].scores).toEqual({ kills: 1, crownKills: 1 });
  });

  it('credits nobody for a decay faint (no killer)', () => {
    const players = [makePlayer({ id: 'a', scores: { kills: 2 } })];
    const faint: FaintedEvent = { type: 'fainted', playerId: 'a', cause: { by: 'decay' } };
    const next = applyKills(players, [faint], null);

    expect(next[0].scores).toEqual({ kills: 2 });
  });

  it('credits nobody for an ownerless item faint (killerId absent)', () => {
    const players = [makePlayer({ id: 'a' })];
    const faint: FaintedEvent = {
      type: 'fainted',
      playerId: 'a',
      cause: { by: 'item', itemType: 'rock' },
    };
    const next = applyKills(players, [faint], null);

    expect(next[0].scores).toEqual({});
  });

  it('drops the credit when the killer died the same tick (absent from survivors)', () => {
    const players = [makePlayer({ id: 'survivor' })];
    const next = applyKills(players, [bumpFaint('victim', 'dead-killer')], null);

    expect(next).toEqual(players);
  });

  it('accumulates onto existing scores across several faints', () => {
    const players = [makePlayer({ id: 'killer', scores: { kills: 1, crownKills: 0 } })];
    const next = applyKills(
      players,
      [bumpFaint('v1', 'killer'), bumpFaint('crown', 'killer')],
      'crown',
    );

    expect(next[0].scores).toEqual({ kills: 3, crownKills: 1 });
  });
});

describe('projectTimeAlive', () => {
  it('stamps whole seconds survived since joinedAt onto each player', () => {
    const players = [
      makePlayer({ id: 'a', joinedAt: 1000, scores: { kills: 2 } }),
      makePlayer({ id: 'b', joinedAt: 5500 }),
    ];
    const next = projectTimeAlive(players, 11_000);

    expect(next[0].scores).toEqual({ kills: 2, timeAlive: 10 });
    expect(next[1].scores).toEqual({ timeAlive: 5 });
  });

  it('does not mutate the input players', () => {
    const players = [makePlayer({ id: 'a', joinedAt: 0 })];

    projectTimeAlive(players, 3000);

    expect(players[0].scores).toEqual({});
  });
});

describe('totalScore', () => {
  it('is the weighted sum of the score axes', () => {
    const { weights } = FRENZY.score;

    expect(totalScore({ kills: 2, crownKills: 1, timeAlive: 30 })).toBe(
      2 * weights.kills + 1 * weights.crownKills + 30 * weights.timeAlive,
    );
  });

  it('treats missing axes as zero', () => {
    expect(totalScore({})).toBe(0);
    expect(totalScore({ kills: 1 })).toBe(FRENZY.score.weights.kills);
  });

  it('weights a crown kill higher than a plain kill (the bounty bonus)', () => {
    expect(totalScore({ kills: 1, crownKills: 1 })).toBeGreaterThan(totalScore({ kills: 1 }));
  });
});
