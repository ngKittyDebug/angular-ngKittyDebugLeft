import { describe, expect, it } from 'vitest';

import { spinFor } from './item-spin';

describe('spinFor', () => {
  it('is deterministic for the same id and type', () => {
    expect(spinFor('item-42', 'food')).toEqual(spinFor('item-42', 'food'));
  });

  it('derives a stable spin from the id for a tumbling item', () => {
    // hash('a') = 97 → magnitude 97; spin = 2500 + 97 % 3500 = 2597; reverse = 97 & 1 = 1.
    expect(spinFor('a', 'food')).toEqual({ durationMs: 2597, reverse: true });
  });

  it('uses the shorter sway range for the shield', () => {
    // Same magnitude 97 → sway = 900 + 97 % 900 = 997.
    expect(spinFor('a', 'shield')).toEqual({ durationMs: 997, reverse: true });
  });

  it('keeps a tumbling item within the spin band and a shield within the sway band', () => {
    for (const id of ['x', 'yy', 'item-1', 'item-2', 'zzzzz']) {
      const spin = spinFor(id, 'rock');

      expect(spin.durationMs).toBeGreaterThanOrEqual(2500);
      expect(spin.durationMs).toBeLessThan(6000);

      const sway = spinFor(id, 'shield');

      expect(sway.durationMs).toBeGreaterThanOrEqual(900);
      expect(sway.durationMs).toBeLessThan(1800);
    }
  });
});
