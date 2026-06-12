import { describe, expect, it } from 'vitest';

import { FRENZY, halfExtentNorm } from '@game/frenzy/config';
import type { Item, Player, ServerState } from '@game/frenzy/types';

import { applyTick } from '../engine/apply-tick';

const PLAYER: Player = {
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  stage: 1,
  mass: 100,
  x: 0.5,
  y: 0.6,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
};

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'food',
    x: 0.5,
    y: 0.2,
    vy: 0.3,
    ...overrides,
  };
}

function stateWith(players: Player[], items: Item[]): ServerState {
  return { players, items, tick: 0 };
}

describe('applyTick', () => {
  it('advances items by vy * deltaSeconds', () => {
    const state = stateWith([PLAYER], [makeItem({ y: 0.2, vy: 0.3 })]);

    const { state: next } = applyTick(state, 0.1, false);

    expect(next.items[0].y).toBeCloseTo(0.23, 5);
  });

  it('drifts a launched (vx) item horizontally and zeroes vx once it hits the size-aware edge', () => {
    const halfWidth = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.width);

    const launched = makeItem({ x: 0.5, y: 0.2, vx: -0.1, vy: 0.3 });
    const { state: mid } = applyTick(stateWith([PLAYER], [launched]), 0.1, false);

    expect(mid.items[0].x).toBeCloseTo(0.49, 5);
    expect(mid.items[0].vx).toBeCloseTo(-0.1, 5);

    // Left wall: centre stops half a sprite-width inside the edge, not at 0, so the sprite stays fully in-world.
    const atLeft = makeItem({ x: 0.02, y: 0.2, vx: -0.1, vy: 0.3 });
    const { state: stoppedLeft } = applyTick(stateWith([PLAYER], [atLeft]), 0.5, false);

    expect(stoppedLeft.items[0].x).toBeCloseTo(halfWidth, 5);
    expect(stoppedLeft.items[0].vx).toBe(0);

    // Right wall: symmetric, centre stops at 1 - halfWidth.
    const atRight = makeItem({ x: 0.98, y: 0.2, vx: 0.1, vy: 0.3 });
    const { state: stoppedRight } = applyTick(stateWith([PLAYER], [atRight]), 0.5, false);

    expect(stoppedRight.items[0].x).toBeCloseTo(1 - halfWidth, 5);
    expect(stoppedRight.items[0].vx).toBe(0);
  });

  it('leaves a plain item (no vx) horizontally fixed', () => {
    const { state: next } = applyTick(
      stateWith([PLAYER], [makeItem({ x: 0.5, vy: 0.3 })]),
      0.1,
      false,
    );

    expect(next.items[0].x).toBe(0.5);
    expect(next.items[0].vx).toBeUndefined();
  });

  it('settles an item on the floor and starts its rest timer when it reaches the bottom', () => {
    const state = stateWith([PLAYER], [makeItem({ y: 0.95, vy: 0.3 })]);

    const { state: next } = applyTick(state, 0.5, false);

    expect(next.items).toHaveLength(1);
    expect(next.items[0].y).toBe(1);
    expect(next.items[0].vy).toBe(0);
    expect(next.items[0].restMs).toBe(FRENZY.itemRestMs);
  });

  it('counts down a resting item and removes it once its rest time elapses', () => {
    const resting = makeItem({ y: 1, vy: 0, restMs: 50 });
    const state = stateWith([PLAYER], [resting]);

    const { state: next } = applyTick(state, 0.1, false);

    expect(next.items).toHaveLength(0);
  });

  it('leaves player mass untouched when applyDecay is false', () => {
    const state = stateWith([PLAYER], []);

    const { state: next, events } = applyTick(state, 0.1, false);

    expect(next.players[0].mass).toBe(PLAYER.mass);
    expect(events).toEqual([]);
  });

  it('applies decay when applyDecay is true', () => {
    const state = stateWith([PLAYER], []);

    const { state: next } = applyTick(state, 0.1, true);

    expect(next.players[0].mass).toBe(98);
  });

  it('emits fainted and removes player when decay drops mass to zero', () => {
    const dying: Player = { ...PLAYER, mass: 1 };
    const state = stateWith([dying], []);

    const { state: next, events } = applyTick(state, 0.1, true);

    expect(next.players).toHaveLength(0);
    expect(events).toEqual([{ type: 'fainted', playerId: 'p1' }]);
  });

  it('drifts a player by velocity * delta on a non-decay tick', () => {
    const drifting: Player = { ...PLAYER, x: 0.5, y: 0.6, vx: 0.03, vy: -0.02 };
    const { state: next } = applyTick(stateWith([drifting], []), 0.1, false);

    expect(next.players[0].x).toBeCloseTo(0.503, 5);
    expect(next.players[0].y).toBeCloseTo(0.598, 5);
  });

  it('prunes a lapsed effect at the start of the tick', () => {
    const expiring: Player = {
      ...PLAYER,
      x: 0.5,
      y: 0.6,
      vx: 0.03,
      vy: -0.02,
      effects: [{ kind: 'laying', expiresAt: 4000 }],
    };
    const { state: next } = applyTick(stateWith([expiring], []), 0.1, false, Math.random, 5000);

    expect(next.players[0].effects).toEqual([]);
  });

  it('bounces a player off the drift-zone edges (clamps position, inverts velocity)', () => {
    const { maxX, minY } = FRENZY.playerDriftZone;
    const atEdge: Player = { ...PLAYER, x: maxX - 0.001, y: minY + 0.001, vx: 0.03, vy: -0.03 };
    const { state: next } = applyTick(stateWith([atEdge], []), 0.1, false);

    expect(next.players[0].x).toBe(maxX);
    expect(next.players[0].vx).toBeLessThan(0);
    expect(next.players[0].y).toBe(minY);
    expect(next.players[0].vy).toBeGreaterThan(0);
  });

  it('eats food that overlaps a Pokémon (emits eaten, removes the item, grows the mass)', () => {
    const food = makeItem({ type: 'food', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(stateWith([PLAYER], [food]), 0.1, false);

    expect(next.items).toHaveLength(0);
    expect(next.players[0].mass).toBe(PLAYER.mass + FRENZY.itemEffects.food);
    expect(events).toContainEqual({
      type: 'eaten',
      itemId: 'i1',
      itemType: 'food',
      playerId: 'p1',
      newMass: PLAYER.mass + FRENZY.itemEffects.food,
      delta: FRENZY.itemEffects.food,
      x: 0.5,
      y: 0.6,
    });
  });

  it('damages a Pokémon that a rock bonks (emits eaten with negative delta, removes the rock)', () => {
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(stateWith([PLAYER], [rock]), 0.1, false);

    expect(next.items).toHaveLength(0);
    expect(next.players[0].mass).toBe(PLAYER.mass + FRENZY.collision.rockDamage);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'eaten',
        itemType: 'rock',
        delta: FRENZY.collision.rockDamage,
      }),
    );
  });

  it('resolves a collision against the closest alive Pokémon only', () => {
    const near: Player = { ...PLAYER, id: 'near', x: 0.5, y: 0.6 };
    const far: Player = { ...PLAYER, id: 'far', x: 0.58, y: 0.6 };
    const food = makeItem({ type: 'food', x: 0.53, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(stateWith([near, far], [food]), 0.1, false);

    expect(next.players.find((player) => player.id === 'near')?.mass).toBe(
      PLAYER.mass + FRENZY.itemEffects.food,
    );
    expect(next.players.find((player) => player.id === 'far')?.mass).toBe(PLAYER.mass);
    expect(events.filter((event) => event.type === 'eaten')).toHaveLength(1);
  });

  it('gives a bigger (evolved) Pokémon a wider catch reach', () => {
    // 0.075 * world.width (1600) = 120px: inside a stage-3 reach but outside a stage-1 reach.
    const small: Player = { ...PLAYER, stage: 1, x: 0.5, y: 0.6 };
    const smallRun = applyTick(
      stateWith([small], [makeItem({ type: 'food', x: 0.575, y: 0.6, vy: 0 })]),
      0.1,
      false,
    );

    expect(smallRun.events.filter((event) => event.type === 'eaten')).toHaveLength(0);

    const big: Player = { ...PLAYER, stage: 3, x: 0.5, y: 0.6 };
    const bigRun = applyTick(
      stateWith([big], [makeItem({ type: 'food', x: 0.575, y: 0.6, vy: 0 })]),
      0.1,
      false,
    );

    expect(bigRun.events.filter((event) => event.type === 'eaten')).toHaveLength(1);
  });

  it('an owned (emitted) item skips its owner but still collides with a rival', () => {
    const owner: Player = { ...PLAYER, id: 'owner', x: 0.5, y: 0.6 };
    const rival: Player = { ...PLAYER, id: 'rival', x: 0.56, y: 0.6 };
    const ownedFood = makeItem({ type: 'food', x: 0.5, y: 0.6, vy: 0, ownerId: 'owner' });
    const { state: next, events } = applyTick(stateWith([owner, rival], [ownedFood]), 0.1, false);

    expect(next.players.find((player) => player.id === 'owner')?.mass).toBe(PLAYER.mass);
    expect(next.players.find((player) => player.id === 'rival')?.mass).toBe(
      PLAYER.mass + FRENZY.itemEffects.food,
    );
    expect(events.filter((event) => event.type === 'eaten')).toHaveLength(1);
  });

  it('an owned item near only its owner does not collide at all (stays on the field)', () => {
    const owner: Player = { ...PLAYER, id: 'owner', x: 0.5, y: 0.6 };
    const ownedFood = makeItem({ type: 'food', x: 0.5, y: 0.6, vy: 0, ownerId: 'owner' });
    const { state: next, events } = applyTick(stateWith([owner], [ownedFood]), 0.1, false);

    expect(next.items).toHaveLength(1);
    expect(next.players[0].mass).toBe(PLAYER.mass);
    expect(events).toEqual([]);
  });

  it('does not collide when the item is outside the collision radius', () => {
    const food = makeItem({ type: 'food', x: 0.5, y: 0.2, vy: 0 });
    const { state: next, events } = applyTick(stateWith([PLAYER], [food]), 0.1, false);

    expect(next.items).toHaveLength(1);
    expect(events).toEqual([]);
  });

  it('does not hit a disconnected Pokémon', () => {
    const offline: Player = { ...PLAYER, status: 'disconnected', x: 0.5, y: 0.6 };
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(stateWith([offline], [rock]), 0.1, false);

    expect(next.items).toHaveLength(1);
    expect(next.players[0].mass).toBe(PLAYER.mass);
    expect(events).toEqual([]);
  });

  it('detonates a bomb on landing: damages Pokémon in range (owner included), removes it, emits detonated', () => {
    const victim: Player = { ...PLAYER, x: 0.5, y: 0.95 };
    const bomb = makeItem({ type: 'bomb', x: 0.5, y: 0.99, vy: FRENZY.fallSpeed.bomb });

    const { state: next, events } = applyTick(stateWith([victim], [bomb]), 0.5, false);

    expect(next.items).toHaveLength(0);
    expect(next.players[0].mass).toBe(PLAYER.mass + FRENZY.bomb.damage);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'detonated',
        radius: FRENZY.bomb.blastRadius,
        playerIds: ['p1'],
      }),
    );
  });

  it('detonates a bomb that bumps a Pokémon mid-air (detonated, not eaten; blasts the area)', () => {
    const hit: Player = { ...PLAYER, id: 'hit', x: 0.5, y: 0.6 };
    const bystander: Player = { ...PLAYER, id: 'bystander', x: 0.55, y: 0.6 };
    const bomb = makeItem({ type: 'bomb', x: 0.5, y: 0.6, vy: FRENZY.fallSpeed.bomb });

    const { state: next, events } = applyTick(stateWith([hit, bystander], [bomb]), 0.1, false);

    expect(next.items).toHaveLength(0);
    expect(next.players.find((player) => player.id === 'hit')?.mass).toBe(
      PLAYER.mass + FRENZY.bomb.damage,
    );
    expect(next.players.find((player) => player.id === 'bystander')?.mass).toBe(
      PLAYER.mass + FRENZY.bomb.damage,
    );
    expect(events.some((event) => event.type === 'eaten')).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: 'detonated' }));
  });

  it('skips decay for a shielded player (mass holds while the shield is live)', () => {
    const shielded: Player = { ...PLAYER, effects: [{ kind: 'shield', expiresAt: 10_000 }] };
    const { state: next } = applyTick(stateWith([shielded], []), 0.1, true, Math.random, 5000);

    expect(next.players[0].mass).toBe(PLAYER.mass);
  });

  it('skips decay for a wellFed player (vitamin pauses the natural bleed)', () => {
    const fed: Player = { ...PLAYER, effects: [{ kind: 'wellFed', expiresAt: 100_000 }] };
    const { state: next } = applyTick(stateWith([fed], []), 0.1, true, Math.random, 5000);

    expect(next.players[0].mass).toBe(PLAYER.mass);
  });

  it('prunes a lapsed effect and resumes decay once it expires', () => {
    const shielded: Player = { ...PLAYER, effects: [{ kind: 'shield', expiresAt: 4000 }] };
    const { state: next } = applyTick(stateWith([shielded], []), 0.1, true, Math.random, 5000);

    expect(next.players[0].effects).toEqual([]);
    expect(next.players[0].mass).toBe(PLAYER.mass - FRENZY.decayPerTick);
  });

  it('heals and grants wellFed (effectGranted, no eaten) when a Pokémon drifts into a vitamin', () => {
    const vitamin = makeItem({ type: 'vitamin', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      stateWith([PLAYER], [vitamin]),
      0.1,
      false,
      Math.random,
      1000,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].mass).toBe(PLAYER.mass + FRENZY.vitamin.hp);
    expect(next.players[0].effects).toEqual([
      { kind: 'wellFed', expiresAt: 1000 + FRENZY.vitamin.decayPauseMs },
    ]);
    expect(events.some((event) => event.type === 'eaten')).toBe(false);
    expect(events).toContainEqual({
      type: 'effectGranted',
      playerId: 'p1',
      effect: { kind: 'wellFed', expiresAt: 1000 + FRENZY.vitamin.decayPauseMs },
      itemId: 'i1',
    });
  });

  it('spares a shielded Pokémon from a bomb blast (no damage, excluded from playerIds)', () => {
    const shielded: Player = {
      ...PLAYER,
      id: 'shielded',
      x: 0.5,
      y: 0.95,
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    };
    const exposed: Player = { ...PLAYER, id: 'exposed', x: 0.52, y: 0.95 };
    const bomb = makeItem({ type: 'bomb', x: 0.5, y: 0.99, vy: FRENZY.fallSpeed.bomb });

    const { state: next, events } = applyTick(
      stateWith([shielded, exposed], [bomb]),
      0.5,
      false,
      Math.random,
      5000,
    );

    expect(next.players.find((player) => player.id === 'shielded')?.mass).toBe(PLAYER.mass);
    expect(next.players.find((player) => player.id === 'exposed')?.mass).toBe(
      PLAYER.mass + FRENZY.bomb.damage,
    );
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'detonated', playerIds: ['exposed'] }),
    );
  });

  it('nullifies rock collision damage for a shielded Pokémon', () => {
    const shielded: Player = {
      ...PLAYER,
      x: 0.5,
      y: 0.6,
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    };
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next } = applyTick(stateWith([shielded], [rock]), 0.1, false, Math.random, 5000);

    expect(next.items).toHaveLength(0);
    expect(next.players[0].mass).toBe(PLAYER.mass);
  });

  it('emits fainted when a rock collision drops mass to zero', () => {
    const frail: Player = { ...PLAYER, mass: 10, x: 0.5, y: 0.6 };
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(stateWith([frail], [rock]), 0.1, false);

    expect(next.items).toHaveLength(0);
    expect(next.players).toHaveLength(0);
    expect(events).toContainEqual({ type: 'fainted', playerId: 'p1' });
  });
});
