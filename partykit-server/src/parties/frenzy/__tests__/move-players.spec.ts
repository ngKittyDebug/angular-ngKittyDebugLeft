import { describe, expect, it } from 'vitest';

import { FRENZY, halfExtentNorm } from '@game/frenzy/config';
import type { Player, PlayerBody } from '@game/frenzy/types';

import { movePlayers } from '../engine/tick/move-players';
import { TEST_BODY } from './test-body';

const PLAYER: Player = {
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  body: TEST_BODY,
  stage: 1,
  hp: 100,
  x: 0.5,
  y: 0.6,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
};

// A body wide enough that its half-sprite inset exceeds the drift-zone side inset (so size-aware bounds bite).
const WIDE_BODY: PlayerBody = {
  ...TEST_BODY,
  1: { ...TEST_BODY[1], width: 300 },
};

describe('movePlayers', () => {
  it('advances a drifting player by its velocity', () => {
    const drifting: Player = { ...PLAYER, x: 0.5, y: 0.6, vx: 0.02, vy: -0.01 };
    const [moved] = movePlayers([drifting], 1);

    expect(moved.x).toBeCloseTo(0.52, 5);
    expect(moved.y).toBeCloseTo(0.59, 5);
  });

  it('keeps an oversized body further from the wall than the drift zone alone', () => {
    const inset = halfExtentNorm(WIDE_BODY[1].width, FRENZY.world.width);
    const wide: Player = { ...PLAYER, body: WIDE_BODY, x: 0.07, vx: -0.02 };
    const small: Player = { ...PLAYER, x: 0.07, vx: -0.02 };

    // Same move: the wide body bounces at its size-aware inset; the small body drifts on (zone not reached).
    expect(movePlayers([wide], 1)[0].x).toBeCloseTo(inset, 5);
    expect(movePlayers([small], 1)[0].x).toBeCloseTo(0.05, 5);
    expect(inset).toBeGreaterThan(FRENZY.playerDriftZone.minX);
  });

  it('damps a hard bounce (keeps speed above the floor)', () => {
    const fast: Player = { ...PLAYER, x: FRENZY.playerDriftZone.minX, vx: -0.2, vy: 0 };
    const [bounced] = movePlayers([fast], 1);

    expect(bounced.vx).toBeCloseTo(0.2 * FRENZY.bounceDamping.wall, 5);
    expect(bounced.vx).toBeGreaterThan(TEST_BODY[1].speed);
  });

  it('bites harder on the floor than the side walls', () => {
    const intoFloor: Player = { ...PLAYER, y: FRENZY.playerDriftZone.maxY, vy: 0.2, vx: 0 };
    const [bounced] = movePlayers([intoFloor], 1);

    // Reflected and damped by the (stronger) floor factor, not the wall factor.
    expect(bounced.vy).toBeCloseTo(-0.2 * FRENZY.bounceDamping.floor, 5);
    expect(FRENZY.bounceDamping.floor).toBeLessThan(FRENZY.bounceDamping.wall);
  });

  it('floors a soft bounce back up to the stage cruising speed (no stall)', () => {
    const slow: Player = { ...PLAYER, x: FRENZY.playerDriftZone.minX, vx: -0.02, vy: 0 };
    const [bounced] = movePlayers([slow], 1);

    // 0.02 * 0.85 = 0.017 < cruise 0.03 → floored back up to the stage's cruising speed.
    expect(Math.hypot(bounced.vx, bounced.vy)).toBeCloseTo(TEST_BODY[1].speed, 5);
    expect(bounced.vx).toBeGreaterThan(0);
  });
});
