import { describe, expect, it } from 'vitest';

import type { HumanPlayer, Player, PlayerEffect } from '@game/frenzy/types';

import { pruneExpiredEffects } from '../core/tick/prune-effects';
import { TEST_BODY } from './test-body';

function makePlayer(effects: PlayerEffect[], overrides: Partial<HumanPlayer> = {}): Player {
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
    effects,
    scores: {},
    ...overrides,
  };
}

describe('pruneExpiredEffects', () => {
  it('drops effects whose expiresAt is at or before now and keeps the rest', () => {
    const player = makePlayer([
      { kind: 'shield', expiresAt: 999 },
      { kind: 'wellFed', expiresAt: 1000 },
      { kind: 'laying', expiresAt: 1001 },
    ]);
    const [pruned] = pruneExpiredEffects([player], 1000);

    expect(pruned.effects).toEqual([{ kind: 'laying', expiresAt: 1001 }]);
  });

  it('returns the SAME player reference when nothing expired (no churn)', () => {
    const player = makePlayer([{ kind: 'shield', expiresAt: 5000 }]);
    const [pruned] = pruneExpiredEffects([player], 1000);

    expect(pruned).toBe(player);
  });

  it('returns a fresh player object when an effect is pruned (does not mutate the input)', () => {
    const player = makePlayer([{ kind: 'shield', expiresAt: 500 }]);
    const [pruned] = pruneExpiredEffects([player], 1000);

    expect(pruned).not.toBe(player);
    expect(player.effects).toHaveLength(1);
    expect(pruned.effects).toEqual([]);
  });
});
