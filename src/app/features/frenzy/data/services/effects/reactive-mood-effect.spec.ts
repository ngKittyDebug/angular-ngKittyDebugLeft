import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ItemType, PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import { effectContext } from './effect-context.mock';
import { ReactiveMoodEffect } from './reactive-mood-effect.service';

function detonated(playerId: string, delta: number): ServerMessage {
  return {
    type: 'detonated',
    itemId: 'bomb-1',
    x: 0.5,
    y: 0.5,
    radius: 0.2,
    hits: [{ playerId, delta }],
  };
}

function eaten(itemType: ItemType, delta: number): ServerMessage {
  return {
    type: 'eaten',
    itemId: 'i1',
    itemType,
    playerId: 'me',
    newHp: 50,
    delta,
    x: 0.5,
    y: 0.5,
    via: 'click',
  };
}

function effectGranted(kind: PlayerEffectKind): ServerMessage {
  return {
    type: 'effectGranted',
    playerId: 'me',
    effect: { kind, expiresAt: Number.MAX_SAFE_INTEGER },
    itemId: 'i1',
    x: 0.5,
    y: 0.5,
    via: 'click',
  };
}

describe('ReactiveMoodEffect', () => {
  let effect: ReactiveMoodEffect;
  const context = effectContext({ myId: 'me' });

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [ReactiveMoodEffect],
    });
    effect = TestBed.inject(ReactiveMoodEffect);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no reaction face', () => {
    expect(effect.reactionFace()).toBeNull();
  });

  it('flashes the hurt face on a substantial bomb hit to my Pokémon', () => {
    effect.handle(detonated('me', -25), context);

    expect(effect.reactionFace()).toBe('hurt');
  });

  it('ignores a far-off bomb graze below the damage threshold', () => {
    effect.handle(detonated('me', -5), context);

    expect(effect.reactionFace()).toBeNull();
  });

  it('ignores a bomb hit on another player', () => {
    effect.handle(detonated('other', -50), context);

    expect(effect.reactionFace()).toBeNull();
  });

  it('flashes the dizzy face when my Pokémon is bumped', () => {
    effect.handle({ type: 'bumped', playerId: 'me', amount: -5 }, context);

    expect(effect.reactionFace()).toBe('dizzy');
  });

  it('flashes the bonk face on a blunt rock/brick eat', () => {
    effect.handle(eaten('rock', -5), context);

    expect(effect.reactionFace()).toBe('bonk');
  });

  it('flashes the sick face on a poison (rotten) eat', () => {
    effect.handle(eaten('rotten', -15), context);

    expect(effect.reactionFace()).toBe('sick');
  });

  it('ignores a nourishing eat (non-negative delta)', () => {
    effect.handle(eaten('food', 10), context);

    expect(effect.reactionFace()).toBeNull();
  });

  it('flashes the pumped face on a buff pickup', () => {
    effect.handle(effectGranted('shield'), context);

    expect(effect.reactionFace()).toBe('pumped');
  });

  it('ignores a non-buff effect grant (e.g. laying)', () => {
    effect.handle(effectGranted('laying'), context);

    expect(effect.reactionFace()).toBeNull();
  });

  it('clears the face after its lifetime elapses', () => {
    effect.handle({ type: 'bumped', playerId: 'me', amount: -5 }, context);

    vi.advanceTimersByTime(3000);

    expect(effect.reactionFace()).toBeNull();
  });

  it('lets a fresh reaction interrupt the previous one rather than stacking', () => {
    effect.handle({ type: 'bumped', playerId: 'me', amount: -5 }, context);
    effect.handle(detonated('me', -25), context);

    expect(effect.reactionFace()).toBe('hurt');
  });

  it('does nothing when there is no local player', () => {
    const noMe = effectContext({ myId: null });

    effect.handle({ type: 'bumped', playerId: 'me', amount: -5 }, noMe);

    expect(effect.reactionFace()).toBeNull();
  });
});
