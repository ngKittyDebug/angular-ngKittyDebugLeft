import { describe, expect, it } from 'vitest';

import { FRENZY, halfExtentNorm, restYFor } from '@game/frenzy/config';
import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { Item, Player, ServerState } from '@game/frenzy/types';

import { applyTick } from '../../../engine/core/apply-tick';
import { TEST_BODY } from '../../../engine/__tests__/test-body';
import { frenzyNpcHooks } from '../game';

const PLAYER: Player = {
  kind: 'human',
  id: 'p1',
  name: 'Ash',
  appearance: 'caterpie',
  body: TEST_BODY,
  stage: 1,
  hp: 100,
  mana: 0,
  x: 0.5,
  y: 0.6,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
  scores: {},
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

    const { state: next } = applyTick(FRENZY_DEFINITION, frenzyNpcHooks, state, 0.1, false);

    expect(next.items[0].y).toBeCloseTo(0.23, 5);
  });

  it('drifts a launched (vx) item horizontally and zeroes vx once it hits the size-aware edge', () => {
    const halfWidth = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.width);

    const launched = makeItem({ x: 0.5, y: 0.2, vx: -0.1, vy: 0.3 });
    const { state: mid } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [launched]),
      0.1,
      false,
    );

    expect(mid.items[0].x).toBeCloseTo(0.49, 5);
    expect(mid.items[0].vx).toBeCloseTo(-0.1, 5);

    // Left wall: centre stops half a sprite-width inside the edge, not at 0, so the sprite stays fully in-world.
    const atLeft = makeItem({ x: 0.02, y: 0.2, vx: -0.1, vy: 0.3 });
    const { state: stoppedLeft } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [atLeft]),
      0.5,
      false,
    );

    expect(stoppedLeft.items[0].x).toBeCloseTo(halfWidth, 5);
    expect(stoppedLeft.items[0].vx).toBe(0);

    // Right wall: symmetric, centre stops at 1 - halfWidth.
    const atRight = makeItem({ x: 0.98, y: 0.2, vx: 0.1, vy: 0.3 });
    const { state: stoppedRight } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [atRight]),
      0.5,
      false,
    );

    expect(stoppedRight.items[0].x).toBeCloseTo(1 - halfWidth, 5);
    expect(stoppedRight.items[0].vx).toBe(0);
  });

  it('advances a landing launched item by only the pre-touchdown fraction of the tick', () => {
    // Start just above the item's hashed rest line so it touches down partway through this tick. The horizontal
    // travel must be scaled to that fraction (`vx * (restY - y0) / vy`), NOT a full tick's `vx` — otherwise the
    // item overshoots and snaps back on the next snapshot (the angled-near-floor "hop" bug this guards).
    const restY = restYFor('i1');
    const vy = 0.3;
    const vx = -0.1;
    const startY = restY - 0.01;
    const launched = makeItem({ x: 0.5, y: startY, vx, vy });

    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [launched]),
      0.1,
      false,
    );
    const fractionX = 0.5 + vx * ((restY - startY) / vy);

    expect(next.items[0].x).toBeCloseTo(fractionX, 5);
    // Strictly less travel than a full-tick advance (0.5 + vx * dt = 0.49) — proves the fraction is applied.
    expect(next.items[0].x).toBeGreaterThan(0.49);
    expect(next.items[0].y).toBeCloseTo(restY, 5);
    expect(next.items[0].vy).toBe(0);
  });

  it('leaves a plain item (no vx) horizontally fixed', () => {
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [makeItem({ x: 0.5, vy: 0.3 })]),
      0.1,
      false,
    );

    expect(next.items[0].x).toBe(0.5);
    expect(next.items[0].vx).toBeUndefined();
  });

  it('settles an item on its per-item seabed line and starts its rest timer when it reaches the floor', () => {
    const state = stateWith([PLAYER], [makeItem({ y: 0.8, vy: 0.3 })]);

    const { state: next } = applyTick(FRENZY_DEFINITION, frenzyNpcHooks, state, 0.5, false);

    expect(next.items).toHaveLength(1);
    // Settles at the hashed rest line for this id (within itemRestYRange), not a flat y=1.
    expect(next.items[0].y).toBeCloseTo(restYFor('i1', FRENZY.itemRestYRange), 5);
    expect(next.items[0].vy).toBe(0);
    expect(next.items[0].restMs).toBe(FRENZY.itemRestMs);
  });

  it('counts down a resting item and removes it once its rest time elapses', () => {
    const resting = makeItem({ y: 1, vy: 0, restMs: 50 });
    const state = stateWith([PLAYER], [resting]);

    const { state: next } = applyTick(FRENZY_DEFINITION, frenzyNpcHooks, state, 0.1, false);

    expect(next.items).toHaveLength(0);
  });

  it('leaves player hp untouched when applyDecay is false', () => {
    const state = stateWith([PLAYER], []);

    const { state: next, events } = applyTick(FRENZY_DEFINITION, frenzyNpcHooks, state, 0.1, false);

    expect(next.players[0].hp).toBe(PLAYER.hp);
    expect(events).toEqual([]);
  });

  it('applies decay when applyDecay is true', () => {
    const state = stateWith([PLAYER], []);

    const { state: next } = applyTick(FRENZY_DEFINITION, frenzyNpcHooks, state, 0.1, true);

    expect(next.players[0].hp).toBe(98);
  });

  it('emits fainted and removes player when decay drops hp to zero', () => {
    const dying: Player = { ...PLAYER, hp: 1 };
    const state = stateWith([dying], []);

    const { state: next, events } = applyTick(FRENZY_DEFINITION, frenzyNpcHooks, state, 0.1, true);

    expect(next.players).toHaveLength(0);
    expect(events).toEqual([{ type: 'fainted', playerId: 'p1', cause: { by: 'decay' } }]);
  });

  it('drifts a player by velocity * delta on a non-decay tick', () => {
    const drifting: Player = { ...PLAYER, x: 0.5, y: 0.6, vx: 0.03, vy: -0.02 };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([drifting], []),
      0.1,
      false,
    );

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
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([expiring], []),
      0.1,
      false,
      Math.random,
      5000,
    );

    expect(next.players[0].effects).toEqual([]);
  });

  it('bounces a player off the drift-zone edges (clamps position, inverts velocity)', () => {
    const { maxX, minY } = FRENZY.playerDriftZone;
    const atEdge: Player = { ...PLAYER, x: maxX - 0.001, y: minY + 0.001, vx: 0.03, vy: -0.03 };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([atEdge], []),
      0.1,
      false,
    );

    expect(next.players[0].x).toBe(maxX);
    expect(next.players[0].vx).toBeLessThan(0);
    expect(next.players[0].y).toBe(minY);
    expect(next.players[0].vy).toBeGreaterThan(0);
  });

  it('eats food that overlaps a player (emits eaten, removes the item, grows the hp)', () => {
    const food = makeItem({ type: 'food', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [food]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(PLAYER.hp + FRENZY.itemEffects.food);
    expect(events).toContainEqual({
      type: 'eaten',
      itemId: 'i1',
      itemType: 'food',
      playerId: 'p1',
      newHp: PLAYER.hp + FRENZY.itemEffects.food,
      delta: FRENZY.itemEffects.food,
      x: 0.5,
      y: 0.6,
      via: 'collision',
    });
  });

  it('damages a player that a rock bonks (emits eaten with negative delta, removes the rock)', () => {
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [rock]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(PLAYER.hp + FRENZY.collision.rockDamage);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'eaten',
        itemType: 'rock',
        delta: FRENZY.collision.rockDamage,
      }),
    );
  });

  it('resolves a collision against the closest alive player only', () => {
    const near: Player = { ...PLAYER, id: 'near', x: 0.5, y: 0.6 };
    const far: Player = { ...PLAYER, id: 'far', x: 0.58, y: 0.6 };
    const food = makeItem({ type: 'food', x: 0.53, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([near, far], [food]),
      0.1,
      false,
    );

    expect(next.players.find((player) => player.id === 'near')?.hp).toBe(
      PLAYER.hp + FRENZY.itemEffects.food,
    );
    expect(next.players.find((player) => player.id === 'far')?.hp).toBe(PLAYER.hp);
    expect(events.filter((event) => event.type === 'eaten')).toHaveLength(1);
  });

  it('gives a bigger (evolved) player a wider catch reach', () => {
    // 100px horizontal gap (derived from world.width so it survives a world resize): inside a stage-3 reach
    // (120px) but outside a stage-1 reach (75px).
    const itemX = 0.5 + 100 / FRENZY.world.width;
    const small: Player = { ...PLAYER, stage: 1, x: 0.5, y: 0.6 };
    const smallRun = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([small], [makeItem({ type: 'food', x: itemX, y: 0.6, vy: 0 })]),
      0.1,
      false,
    );

    expect(smallRun.events.filter((event) => event.type === 'eaten')).toHaveLength(0);

    const big: Player = { ...PLAYER, stage: 3, x: 0.5, y: 0.6 };
    const bigRun = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([big], [makeItem({ type: 'food', x: itemX, y: 0.6, vy: 0 })]),
      0.1,
      false,
    );

    expect(bigRun.events.filter((event) => event.type === 'eaten')).toHaveLength(1);
  });

  it('an owned (emitted) item skips its owner but still collides with a rival', () => {
    const owner: Player = { ...PLAYER, id: 'owner', x: 0.5, y: 0.6 };
    // 60px from the item (derived from world.width) — comfortably inside a stage-1 reach (75px) on any world size.
    const rival: Player = { ...PLAYER, id: 'rival', x: 0.5 + 60 / FRENZY.world.width, y: 0.6 };
    const ownedFood = makeItem({ type: 'food', x: 0.5, y: 0.6, vy: 0, ownerId: 'owner' });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([owner, rival], [ownedFood]),
      0.1,
      false,
    );

    expect(next.players.find((player) => player.id === 'owner')?.hp).toBe(PLAYER.hp);
    expect(next.players.find((player) => player.id === 'rival')?.hp).toBe(
      PLAYER.hp + FRENZY.itemEffects.food,
    );
    expect(events.filter((event) => event.type === 'eaten')).toHaveLength(1);
  });

  it('an owned item near only its owner does not collide at all (stays on the field)', () => {
    const owner: Player = { ...PLAYER, id: 'owner', x: 0.5, y: 0.6 };
    const ownedFood = makeItem({ type: 'food', x: 0.5, y: 0.6, vy: 0, ownerId: 'owner' });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([owner], [ownedFood]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(1);
    expect(next.players[0].hp).toBe(PLAYER.hp);
    expect(events).toEqual([]);
  });

  it('does not collide when the item is outside the collision radius', () => {
    const food = makeItem({ type: 'food', x: 0.5, y: 0.2, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [food]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(1);
    expect(events).toEqual([]);
  });

  it('does not hit a disconnected player', () => {
    const offline: Player = { ...PLAYER, status: 'disconnected', x: 0.5, y: 0.6 };
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([offline], [rock]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(1);
    expect(next.players[0].hp).toBe(PLAYER.hp);
    expect(events).toEqual([]);
  });

  it('drifts a bomb at constant velocity and bounces it off the side wall (damped)', () => {
    const halfWidth = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.width);
    // Heading into the right wall with a gentle downward coast; after the bounce vx flips left and is damped, while
    // vy is unchanged (no gravity — the bomb steers like a player, so its velocity only changes on shove/bounce).
    const bomb = makeItem({ type: 'bomb', x: 1 - halfWidth - 0.001, y: 0.3, vx: 0.03, vy: 0.01 });
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([], [bomb]),
      0.1,
      false,
    );
    const moved = next.items[0];

    expect(moved.x).toBeLessThanOrEqual(1 - halfWidth + 1e-9);
    expect(moved.vx ?? 0).toBeLessThan(0); // bounced back toward the left
    expect(Math.abs(moved.vx ?? 0)).toBeLessThan(0.03); // damped on the bounce
    expect(moved.vy).toBe(0.01); // constant — no gravity to accelerate the sink (stays under the speed cap)
  });

  it('detonates a bomb on landing: damages player in range (owner included), removes it, emits detonated', () => {
    const victim: Player = { ...PLAYER, x: 0.5, y: 0.95 };
    const bomb = makeItem({ type: 'bomb', x: 0.5, y: 0.99, vy: FRENZY.fallSpeed.bomb });

    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([victim], [bomb]),
      0.5,
      false,
    );

    expect(next.items).toHaveLength(0);
    // Distance-scaled damage: somewhere between the epicentre max and the radius-edge floor, never zero.
    expect(next.players[0].hp).toBeLessThan(PLAYER.hp);
    expect(next.players[0].hp).toBeGreaterThanOrEqual(PLAYER.hp + FRENZY.bomb.maxDamage);
    expect(next.players[0].hp).toBeLessThanOrEqual(PLAYER.hp + FRENZY.bomb.minDamage);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'detonated',
        radius: FRENZY.bomb.blastRadius,
        hits: [expect.objectContaining({ playerId: 'p1' })],
      }),
    );
  });

  it('detonates the bomb on sensor-horn contact (reach past the shell), still tighter than a food catch', () => {
    const player: Player = { ...PLAYER, x: 0.5, y: 0.6 };

    // 66px to the side: past the bare shell (the 60px item box would miss) but within the bomb's sensor-horn reach
    // (≈72px) → touching a horn detonates the mine.
    const atSensor = 0.5 + 66 / FRENZY.world.width;
    const hit = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([player], [makeItem({ type: 'bomb', x: atSensor, y: 0.6, vy: 0 })]),
      0.05,
      false,
    );

    expect(hit.events.some((event) => event.type === 'detonated')).toBe(true);

    // The bomb's no-assist reach (72px) is now only a hair tighter than food's body-padded catch (75px): the assist
    // pads the body half only, not the item half. A point at 74px is just past the mine's sensors (no detonation)
    // yet still inside food's reach (still eaten) — proving the bomb uses true contact while food keeps a small assist.
    const past = 0.5 + 74 / FRENZY.world.width;
    const miss = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([player], [makeItem({ type: 'bomb', x: past, y: 0.6, vy: 0 })]),
      0.05,
      false,
    );

    expect(miss.events.some((event) => event.type === 'detonated')).toBe(false);

    const food = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([player], [makeItem({ type: 'food', x: past, y: 0.6, vy: 0 })]),
      0.05,
      false,
    );

    expect(food.events.some((event) => event.type === 'eaten')).toBe(true);
  });

  it('detonates a bomb that bumps a player mid-air (detonated, not eaten; blasts the area)', () => {
    const hit: Player = { ...PLAYER, id: 'hit', x: 0.5, y: 0.6 };
    const bystander: Player = { ...PLAYER, id: 'bystander', x: 0.55, y: 0.6 };
    const bomb = makeItem({ type: 'bomb', x: 0.5, y: 0.6, vy: FRENZY.fallSpeed.bomb });

    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([hit, bystander], [bomb]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(0);
    const hitHp = next.players.find((player) => player.id === 'hit')?.hp ?? 0;
    const bystanderHp = next.players.find((player) => player.id === 'bystander')?.hp ?? 0;

    // Both are caught, but the one at the epicentre takes more damage than the one off to the side.
    expect(hitHp).toBeLessThan(PLAYER.hp);
    expect(bystanderHp).toBeLessThan(PLAYER.hp);
    expect(hitHp).toBeLessThan(bystanderHp);
    expect(events.some((event) => event.type === 'eaten')).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: 'detonated' }));
  });

  it('skips decay for a shielded player (hp holds while the shield is live)', () => {
    const shielded: Player = { ...PLAYER, effects: [{ kind: 'shield', expiresAt: 10_000 }] };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([shielded], []),
      0.1,
      true,
      Math.random,
      5000,
    );

    expect(next.players[0].hp).toBe(PLAYER.hp);
  });

  it('skips decay for a wellFed player (vitamin pauses the natural bleed)', () => {
    const fed: Player = { ...PLAYER, effects: [{ kind: 'wellFed', expiresAt: 100_000 }] };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([fed], []),
      0.1,
      true,
      Math.random,
      5000,
    );

    expect(next.players[0].hp).toBe(PLAYER.hp);
  });

  it('prunes a lapsed effect and resumes decay once it expires', () => {
    const shielded: Player = { ...PLAYER, effects: [{ kind: 'shield', expiresAt: 4000 }] };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([shielded], []),
      0.1,
      true,
      Math.random,
      5000,
    );

    expect(next.players[0].effects).toEqual([]);
    expect(next.players[0].hp).toBe(PLAYER.hp - FRENZY.decayPerTick);
  });

  it('heals and grants wellFed (effectGranted, no eaten) when a player drifts into a vitamin', () => {
    const vitamin = makeItem({ type: 'vitamin', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER], [vitamin]),
      0.1,
      false,
      Math.random,
      1000,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(PLAYER.hp + FRENZY.vitamin.hp);
    expect(next.players[0].effects).toEqual([
      { kind: 'wellFed', expiresAt: 1000 + FRENZY.vitamin.decayPauseMs },
    ]);
    expect(events.some((event) => event.type === 'eaten')).toBe(false);
    expect(events).toContainEqual({
      type: 'effectGranted',
      playerId: 'p1',
      effect: { kind: 'wellFed', expiresAt: 1000 + FRENZY.vitamin.decayPauseMs },
      itemId: 'i1',
      x: 0.5,
      y: 0.6,
      via: 'collision',
    });
  });

  it('spares a shielded player from a bomb blast (no damage, excluded from hits)', () => {
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
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([shielded, exposed], [bomb]),
      0.5,
      false,
      Math.random,
      5000,
    );

    expect(next.players.find((player) => player.id === 'shielded')?.hp).toBe(PLAYER.hp);

    const exposedHp = next.players.find((player) => player.id === 'exposed')?.hp ?? 0;

    expect(exposedHp).toBeLessThan(PLAYER.hp);
    expect(exposedHp).toBeGreaterThanOrEqual(PLAYER.hp + FRENZY.bomb.maxDamage);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'detonated',
        hits: [expect.objectContaining({ playerId: 'exposed' })],
      }),
    );
  });

  it('nullifies rock collision damage for a shielded player', () => {
    const shielded: Player = {
      ...PLAYER,
      x: 0.5,
      y: 0.6,
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    };
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([shielded], [rock]),
      0.1,
      false,
      Math.random,
      5000,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players[0].hp).toBe(PLAYER.hp);
  });

  it('emits fainted when a rock collision drops hp to zero', () => {
    const frail: Player = { ...PLAYER, hp: 10, x: 0.5, y: 0.6 };
    const rock = makeItem({ type: 'rock', x: 0.5, y: 0.6, vy: 0 });
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([frail], [rock]),
      0.1,
      false,
    );

    expect(next.items).toHaveLength(0);
    expect(next.players).toHaveLength(0);
    expect(events).toContainEqual({
      type: 'fainted',
      playerId: 'p1',
      cause: { by: 'item', itemType: 'rock' },
    });
  });

  it('separates two overlapping player (player collision enabled by default)', () => {
    const a: Player = { ...PLAYER, id: 'a', x: 0.5, y: 0.6 };
    const b: Player = { ...PLAYER, id: 'b', x: 0.5 + 40 / FRENZY.world.width, y: 0.6 };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([a, b], []),
      0.1,
      false,
    );
    const [movedA, movedB] = next.players;

    expect(movedB.x - movedA.x).toBeGreaterThan(b.x - a.x);
  });

  it('deals bump damage and emits a bumped float event for both survivors on a hard head-on collision', () => {
    // Touching, closing fast: after the drift step they overlap and ram harder than the bump threshold.
    const a: Player = { ...PLAYER, id: 'a', x: 0.5, y: 0.6, vx: 0.04 };
    const b: Player = { ...PLAYER, id: 'b', x: 0.5 + 60 / FRENZY.world.width, y: 0.6, vx: -0.04 };
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([a, b], []),
      0.1,
      false,
    );
    const [movedA, movedB] = next.players;

    expect(movedA.hp).toBe(PLAYER.hp + FRENZY.playerCollision.bumpDamage);
    expect(movedB.hp).toBe(PLAYER.hp + FRENZY.playerCollision.bumpDamage);
    expect(events).toContainEqual({ type: 'bumped', playerId: 'a' });
    expect(events).toContainEqual({ type: 'bumped', playerId: 'b' });
  });

  it('spares a shielded player from bump damage and its float (the rammer still takes both)', () => {
    const shielded: Player = {
      ...PLAYER,
      id: 'shielded',
      x: 0.5,
      y: 0.6,
      vx: 0.04,
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    };
    const rammer: Player = {
      ...PLAYER,
      id: 'rammer',
      x: 0.5 + 60 / FRENZY.world.width,
      y: 0.6,
      vx: -0.04,
    };
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([shielded, rammer], []),
      0.1,
      false,
      Math.random,
      5000,
    );

    expect(next.players.find((player) => player.id === 'shielded')?.hp).toBe(PLAYER.hp);
    expect(next.players.find((player) => player.id === 'rammer')?.hp).toBe(
      PLAYER.hp + FRENZY.playerCollision.bumpDamage,
    );
    expect(events).toContainEqual({ type: 'bumped', playerId: 'rammer' });
    expect(events).not.toContainEqual({ type: 'bumped', playerId: 'shielded' });
  });

  it('emits fainted (cause bump, naming the rammer) when a collision drops hp to zero', () => {
    const frail: Player = { ...PLAYER, id: 'frail', hp: 3, x: 0.5, y: 0.6, vx: 0.04 };
    const rammer: Player = {
      ...PLAYER,
      id: 'rammer',
      x: 0.5 + 60 / FRENZY.world.width,
      y: 0.6,
      vx: -0.04,
    };
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([frail, rammer], []),
      0.1,
      false,
    );

    expect(next.players.find((player) => player.id === 'frail')).toBeUndefined();
    expect(events).toContainEqual({
      type: 'fainted',
      playerId: 'frail',
      cause: { by: 'bump', killerId: 'rammer' },
    });
    // The fatal victim gets its fainted/obituary line, not a bump float quip.
    expect(events).not.toContainEqual({ type: 'bumped', playerId: 'frail' });
  });

  it('leaves overlapping players untouched when player collision is disabled', () => {
    // The flag is plain game data now — disable it on a derived definition instead of mutating the shared one.
    const noCollisionGame = {
      ...FRENZY_DEFINITION,
      playerCollision: { ...FRENZY_DEFINITION.playerCollision, enabled: false },
    };
    const a: Player = { ...PLAYER, id: 'a', x: 0.5, y: 0.6 };
    const b: Player = { ...PLAYER, id: 'b', x: 0.5 + 40 / FRENZY.world.width, y: 0.6 };
    const { state: next } = applyTick(
      noCollisionGame,
      frenzyNpcHooks,
      stateWith([a, b], []),
      0.1,
      false,
    );
    const [movedA, movedB] = next.players;

    expect(movedA.x).toBe(a.x);
    expect(movedB.x).toBe(b.x);
  });
});

const NPC: Player = {
  kind: 'npc',
  npcKind: 'angryBomb',
  id: 'npc-1',
  name: 'angryBomb',
  appearance: 'angryBomb',
  body: ANGRY_BOMB_NPC.body,
  stage: 1,
  hp: 100,
  mana: 0,
  x: 0.5,
  y: FRENZY.npc.floorY,
  vx: 0,
  vy: 0,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 0,
  effects: [],
  scores: {},
};

describe('applyTick — angry-bomb NPC integration', () => {
  it('excludes the NPC from player separation (a human overlapping it is not pushed by it)', () => {
    // A human sitting right on the NPC: with the NPC held out of separation, only the lone human remains, so it
    // has no peer to push it — its x stays put (drift is zero). Proves the NPC didn't separate against it.
    const human: Player = { ...PLAYER, id: 'h', x: NPC.x, y: NPC.y, vx: 0, vy: 0 };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([human, NPC], []),
      0.1,
      false,
    );
    const movedHuman = next.players.find((player) => player.id === 'h');

    expect(movedHuman?.x).toBeCloseTo(human.x, 5);
  });

  it('bleeds the NPC at its own decayPerStep (not the human rate)', () => {
    // Plenty of headroom so decay is non-fatal — assert the NPC lost exactly its own per-step amount.
    const npc: Player = { ...NPC, hp: 100 };
    const { state: next } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER, npc], []),
      0.1,
      true,
    );
    const survivedNpc = next.players.find((player) => player.id === npc.id);

    expect(survivedNpc?.hp).toBe(100 - FRENZY.npc.decayPerStep);
    expect(FRENZY.npc.decayPerStep).not.toBe(FRENZY.decayPerTick);
  });

  it('detonates a starved NPC (hp 0) AFTER decay, emitting detonated + fainted', () => {
    const npc: Player = { ...NPC, hp: FRENZY.npc.decayPerStep };
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER, npc], []),
      0.1,
      true,
    );

    expect(next.players.find((player) => player.id === npc.id)).toBeUndefined();
    expect(events.some((event) => event.type === 'detonated' && event.itemId === npc.id)).toBe(
      true,
    );
    expect(events.some((event) => event.type === 'fainted' && event.playerId === npc.id)).toBe(
      true,
    );
  });

  it('strong-blasts a max-anger NPC within the tick — the blast check beats coolAnger', () => {
    // Regression: a poke tops mana to exactly `anger.max` between ticks. The NPC blast pass must run BEFORE
    // coolAnger, or the per-tick −cooldownPerTick bleed drops mana under max first and the rage blast never fires.
    const npc: Player = { ...NPC, hp: 100, mana: FRENZY.npc.anger.max };
    const { state: next, events } = applyTick(
      FRENZY_DEFINITION,
      frenzyNpcHooks,
      stateWith([PLAYER, npc], []),
      0.1,
      false,
    );

    expect(next.players.find((player) => player.id === npc.id)).toBeUndefined();

    const detonated = events.find((event) => event.type === 'detonated' && event.itemId === npc.id);

    expect(detonated).toBeDefined();
    // Strong blast (stage-scaled), distinct from the weak/starvation radius (= base bomb radius).
    expect(detonated?.type === 'detonated' && detonated.radius).toBe(
      FRENZY.bomb.blastRadius * FRENZY.npc.strongBlast.stageRadiusMultiplier[npc.stage],
    );
    // Strong-blast NPC fainted carries no cause (the weak/starvation one is `{ by: 'decay' }`).
    const fainted = events.find((event) => event.type === 'fainted' && event.playerId === npc.id);

    expect(fainted?.type === 'fainted' && fainted.cause).toBeUndefined();
  });
});
