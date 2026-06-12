import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';

describe('@game/frenzy/* alias resolution', () => {
  it('imports FRENZY constants from shared-game/', () => {
    expect(FRENZY.startingHp).toBe(100);
    expect(FRENZY.maxPlayers).toBe(20);
    expect(FRENZY.bounceDamping.floor).toBeLessThan(FRENZY.bounceDamping.wall);
  });
});
