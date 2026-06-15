import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { HumanPlayer, Player } from '@game/frenzy/types';

import { FRENZY_EFFECTS } from '@game/frenzy/definition';

import { TEST_BODY } from './test-body';
import type { BlastParams } from '../verbs/compute-blast';
import { computeBlast } from '../verbs/compute-blast';

// The item-mine blast params (an explode spec's fields) — what the bomb's descriptor supplies in production.
function itemBombBlastParams(x: number, y: number): BlastParams {
  return {
    x,
    y,
    radius: FRENZY.bomb.blastRadius,
    maxDamage: FRENZY.bomb.maxDamage,
    minDamage: FRENZY.bomb.minDamage,
    blastImpulse: FRENZY.bomb.blastImpulse,
    blastImpulseMaxFactor: FRENZY.bomb.blastImpulseMaxFactor,
  };
}

function makeHuman(overrides: Partial<HumanPlayer> = {}): Player {
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

describe('computeBlast (item-bomb parity)', () => {
  it('deals maxDamage at the epicentre and lifts a co-located player straight up', () => {
    const onTop = makeHuman({ id: 'on-top', x: 0.5, y: 0.5 });
    const { hpDeltas, impulses } = computeBlast(FRENZY_EFFECTS, itemBombBlastParams(0.5, 0.5), [
      onTop,
    ]);

    expect(hpDeltas[0].amount).toBe(FRENZY.bomb.maxDamage); // (1−0)² → full damage
    expect(impulses[0].iy).toBeCloseTo(-FRENZY.bomb.blastImpulse, 5); // straight up
    expect(impulses[0].ix).toBe(0);
  });

  it('falls off quadratically with distance and floors damage at minDamage', () => {
    const half = makeHuman({ id: 'half', x: 0.5 + FRENZY.bomb.blastRadius / 2, y: 0.5 });
    const { hpDeltas } = computeBlast(FRENZY_EFFECTS, itemBombBlastParams(0.5, 0.5), [half]);
    const expected = Math.min(FRENZY.bomb.minDamage, Math.round(FRENZY.bomb.maxDamage * 0.25));

    expect(hpDeltas[0].amount).toBe(expected);
  });

  it('skips shielded players, the dead, and an immune id', () => {
    const shielded = makeHuman({
      id: 'shield',
      x: 0.5,
      y: 0.5,
      effects: [{ kind: 'shield', expiresAt: Number.MAX_SAFE_INTEGER }],
    });
    const dead = makeHuman({ id: 'dead', x: 0.5, y: 0.5, status: 'disconnected' });
    const immune = makeHuman({ id: 'immune', x: 0.5, y: 0.5 });
    const { hpDeltas } = computeBlast(
      FRENZY_EFFECTS,
      itemBombBlastParams(0.5, 0.5),
      [shielded, dead, immune],
      'immune',
    );

    expect(hpDeltas).toHaveLength(0);
  });

  it('ignores players beyond the radius', () => {
    const far = makeHuman({ id: 'far', x: 0.5 + FRENZY.bomb.blastRadius * 1.5, y: 0.5 });
    const { hpDeltas } = computeBlast(FRENZY_EFFECTS, itemBombBlastParams(0.5, 0.5), [far]);

    expect(hpDeltas).toHaveLength(0);
  });
});
