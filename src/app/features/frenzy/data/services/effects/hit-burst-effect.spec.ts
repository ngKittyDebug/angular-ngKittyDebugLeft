import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerMessage } from '@game/frenzy/types';

import { FrenzyStore } from '../../store/frenzy.store';
import { HitBurstEffect } from './hit-burst-effect.service';

// Items are centre-anchored (item.y is the sprite's visual centre), so the burst sits exactly on the reported y.

function eaten(partial: Partial<Extract<ServerMessage, { type: 'eaten' }>> = {}): ServerMessage {
  return {
    type: 'eaten',
    itemId: 'i1',
    itemType: 'food',
    playerId: 'me',
    newHp: 110,
    delta: 10,
    x: 0.9,
    y: 0.8,
    via: 'click',
    ...partial,
  };
}

function effectGranted(
  partial: Partial<Extract<ServerMessage, { type: 'effectGranted' }>> = {},
): ServerMessage {
  return {
    type: 'effectGranted',
    playerId: 'me',
    itemId: 'v1',
    effect: { kind: 'shield', expiresAt: 1000 },
    x: 0.3,
    y: 0.5,
    via: 'click',
    ...partial,
  };
}

describe('HitBurstEffect', () => {
  let effect: HitBurstEffect;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [HitBurstEffect, { provide: FrenzyStore, useValue: { myId: signal('me') } }],
    });
    effect = TestBed.inject(HitBurstEffect);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns a gold (mine) converging burst at my own clicked-eat item centre', () => {
    effect.handle(eaten({ playerId: 'me', via: 'click', x: 0.9, y: 0.8 }));

    const bursts = effect.hitBursts();

    expect(bursts).toHaveLength(1);
    expect(bursts[0].x).toBe(0.9);
    expect(bursts[0].y).toBeCloseTo(0.8, 5);
    expect(bursts[0].mine).toBe(true);
    expect(bursts[0].mode).toBe('converge');
  });

  it('spawns an outward (burst) cue for a drift-in collision, gold when my own Pokémon grabbed it', () => {
    effect.handle(eaten({ playerId: 'me', via: 'collision' }));

    const bursts = effect.hitBursts();

    expect(bursts).toHaveLength(1);
    expect(bursts[0].mine).toBe(true);
    expect(bursts[0].mode).toBe('burst');
  });

  it('spawns a non-mine converging burst for other players clicks too (the room sees each grab)', () => {
    effect.handle(eaten({ playerId: 'other', via: 'click', x: 0.1, y: 0.2 }));

    const bursts = effect.hitBursts();

    expect(bursts).toHaveLength(1);
    expect(bursts[0].x).toBe(0.1);
    expect(bursts[0].y).toBeCloseTo(0.2, 5);
    expect(bursts[0].mine).toBe(false);
    expect(bursts[0].mode).toBe('converge');
  });

  it('turns a rock/brick collision into sparks over the struck Pokémon — no bubble burst', () => {
    effect.handle(eaten({ playerId: 'victim', itemType: 'rock', via: 'collision', delta: -20 }));
    effect.handle(eaten({ playerId: 'me', itemType: 'brick', via: 'collision', delta: -40 }));

    expect(effect.hitBursts()).toHaveLength(0);

    const sparks = effect.ownedSparks();

    expect(sparks).toHaveLength(2);
    expect(sparks[0].ownerId).toBe('victim');
    expect(sparks[1].ownerId).toBe('me');
  });

  it('falls back to the default collision burst when a rock/brick bonk dealt no damage (shielded, delta 0)', () => {
    effect.handle(eaten({ playerId: 'me', itemType: 'rock', via: 'collision', delta: 0 }));

    expect(effect.ownedSparks()).toHaveLength(0);
    expect(effect.hitBursts()).toHaveLength(1);
    expect(effect.hitBursts()[0].mode).toBe('burst');
  });

  it('a CLICKED rock is a normal burst, not sparks (only the collision bonk sparks)', () => {
    effect.handle(eaten({ playerId: 'me', itemType: 'rock', via: 'click', delta: 0 }));

    expect(effect.ownedSparks()).toHaveLength(0);
    expect(effect.hitBursts()).toHaveLength(1);
    expect(effect.hitBursts()[0].mode).toBe('converge');
  });

  it('spawns a burst at the item centre for an effectGranted (egg/poop/shield) — at the spot it vanished', () => {
    effect.handle(effectGranted({ playerId: 'me', via: 'click', x: 0.3, y: 0.5 }));
    effect.handle(effectGranted({ playerId: 'other', via: 'collision', x: 0.6, y: 0.4 }));

    const bursts = effect.hitBursts();

    expect(bursts).toHaveLength(2);
    expect(bursts[0].x).toBe(0.3);
    expect(bursts[0].y).toBeCloseTo(0.5, 5);
    expect(bursts[0].mine).toBe(true);
    expect(bursts[0].mode).toBe('converge');
    expect(bursts[1].mine).toBe(false);
    expect(bursts[1].mode).toBe('burst');
  });

  it('sparks over the rammed Pokémon on a bump — no bubble burst', () => {
    effect.handle({ type: 'bumped', playerId: 'victim', amount: -5 });

    expect(effect.hitBursts()).toHaveLength(0);

    const sparks = effect.ownedSparks();

    expect(sparks).toHaveLength(1);
    expect(sparks[0].ownerId).toBe('victim');
  });

  it('ignores itemNudged and detonated', () => {
    effect.handle({ type: 'itemNudged', itemId: 'b1', x: 0.5, y: 0.5, vx: 0.04, vy: 0.02 });
    effect.handle({
      type: 'detonated',
      itemId: 'b1',
      x: 0.5,
      y: 0.5,
      radius: 0.2,
      hits: [{ playerId: 'me', delta: -10 }],
    });

    expect(effect.hitBursts()).toHaveLength(0);
    expect(effect.ownedSparks()).toHaveLength(0);
  });

  it('auto-removes the burst after its TTL', () => {
    effect.handle(eaten({ playerId: 'me' }));

    expect(effect.hitBursts()).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(effect.hitBursts()).toHaveLength(0);
  });
});
