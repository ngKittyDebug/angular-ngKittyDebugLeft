import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

import { createPlayer } from '../engine/create-player';

const occupiedPlayer = (overrides: Partial<Player>): Player => ({
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
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
  ...overrides,
});

describe('createPlayer', () => {
  it('creates a stage-1 player with starting hp and alive status', () => {
    const player = createPlayer({
      sessionToken: 'tok-1',
      name: 'Ash',
      appearance: 'caterpie',
      now: 1700000000,
      rng: () => 0,
    });

    expect(player).toMatchObject({
      id: 'tok-1',
      name: 'Ash',
      appearance: 'caterpie',
      stage: 1,
      hp: FRENZY.startingHp,
      status: 'alive',
      disconnectedAt: null,
      joinedAt: 1700000000,
    });
  });

  it('places the player within the drift zone', () => {
    const { minX, maxX, minY, maxY } = FRENZY.playerDriftZone;
    const player = createPlayer({
      sessionToken: 'tok-1',
      name: 'Ash',
      appearance: 'pidgey',
      now: 0,
    });

    expect(player.x).toBeGreaterThanOrEqual(minX);
    expect(player.x).toBeLessThanOrEqual(maxX);
    expect(player.y).toBeGreaterThanOrEqual(minY);
    expect(player.y).toBeLessThanOrEqual(maxY);
  });

  it('gives the player an initial velocity with magnitude playerDriftSpeed', () => {
    const player = createPlayer({
      sessionToken: 'tok-1',
      name: 'Ash',
      appearance: 'pidgey',
      now: 0,
    });

    expect(Math.hypot(player.vx, player.vy)).toBeCloseTo(FRENZY.playerDriftSpeed, 6);
  });

  it('keeps at least playerSpawnMinDistance from existing players when a free spot is found', () => {
    const occupied = occupiedPlayer({ x: 0.2, y: 0.5 });
    // rng feeds randomPointInZone (x, then y), then the spawn angle; this first candidate sits far from p1.
    const queue = [0.9, 0.9, 0];
    const rng = (): number => queue.shift() ?? 0;
    const player = createPlayer({
      sessionToken: 'tok-2',
      name: 'Misty',
      appearance: 'pidgey',
      now: 0,
      existingPlayers: [occupied],
      rng,
    });

    expect(Math.hypot(player.x - occupied.x, player.y - occupied.y)).toBeGreaterThanOrEqual(
      FRENZY.playerSpawnMinDistance,
    );
  });
});
