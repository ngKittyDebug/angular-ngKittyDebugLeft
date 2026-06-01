import { describe, expect, it } from 'vitest';

import { GAME } from '@game/frenzy/constants';

describe('@game/frenzy/* alias resolution', () => {
  it('imports GAME constants from shared-game/', () => {
    expect(GAME.startingMass).toBe(100);
    expect(GAME.maxPlayers).toBe(20);
    expect(GAME.thresholds.stage2).toBeLessThan(GAME.thresholds.stage3);
  });
});
