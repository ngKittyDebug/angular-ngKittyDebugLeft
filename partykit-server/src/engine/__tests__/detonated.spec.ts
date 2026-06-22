import { describe, expect, it } from 'vitest';

import type { Item } from '@game/frenzy/types';

import type { HpDelta } from '../verbs';
import { detonated } from '../core/tick/detonated';

function bomb(overrides: Partial<Item> = {}): Item {
  return { id: 'bomb-1', type: 'bomb', x: 0.3, y: 0.8, vy: 0, ...overrides };
}

describe('detonated', () => {
  it('stamps the blast position and id from the exploding item', () => {
    const item = bomb({ id: 'mine-9', x: 0.42, y: 0.66 });

    const event = detonated(item, [], 0.18);

    expect(event).toMatchObject({ type: 'detonated', itemId: 'mine-9', x: 0.42, y: 0.66 });
  });

  it('reports the radius it was given (the resolved blast reach, not a fixed value)', () => {
    const event = detonated(bomb(), [], 0.25);

    expect(event.radius).toBe(0.25);
  });

  it('projects each hp delta into a per-victim hit of player and lost amount', () => {
    const hpDeltas: HpDelta[] = [
      { playerId: 'a', amount: -40, source: 'blast' },
      { playerId: 'b', amount: -6, source: 'blast' },
    ];

    const event = detonated(bomb(), hpDeltas, 0.18);

    expect(event.hits).toEqual([
      { playerId: 'a', delta: -40 },
      { playerId: 'b', delta: -6 },
    ]);
  });

  it('produces an empty hit list when nobody was caught in the blast', () => {
    const event = detonated(bomb(), [], 0.18);

    expect(event.hits).toEqual([]);
  });
});
