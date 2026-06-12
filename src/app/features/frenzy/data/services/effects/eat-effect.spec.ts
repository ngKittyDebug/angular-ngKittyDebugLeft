import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ItemType, Player, ServerMessage, ServerState } from '@game/frenzy/types';

import { BadEatSoundService } from '../sound/bad-eat-sound.service';
import { BrickSoundService } from '../sound/brick-sound.service';
import { EatSoundService } from '../sound/eat-sound.service';
import { RockSoundService } from '../sound/rock-sound.service';
import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { FrenzyStore } from '../../store/frenzy.store';
import { EatEffect } from './eat-effect.service';
import { FloatingMessagesStore } from './floating-messages.store';

function player(id: string, name: string): Player {
  return {
    id,
    name,
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 1,
    hp: 100,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

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

describe('EatEffect', () => {
  let effect: EatEffect;
  let floats: FloatingMessagesStore;
  let eatSound: { play: ReturnType<typeof vi.fn> };
  let badEatSound: { play: ReturnType<typeof vi.fn> };
  let rockSound: { play: ReturnType<typeof vi.fn> };
  let brickSound: { play: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    eatSound = { play: vi.fn() };
    badEatSound = { play: vi.fn() };
    rockSound = { play: vi.fn() };
    brickSound = { play: vi.fn() };

    const state = signal<ServerState | null>({
      players: [player('other', 'Ash')],
      items: [],
      tick: 0,
    });

    TestBed.configureTestingModule({
      providers: [
        EatEffect,
        FloatingMessagesStore,
        { provide: EatSoundService, useValue: eatSound },
        { provide: BadEatSoundService, useValue: badEatSound },
        { provide: RockSoundService, useValue: rockSound },
        { provide: BrickSoundService, useValue: brickSound },
        { provide: FrenzyStore, useValue: { myId: signal('me'), state } },
      ],
    });
    effect = TestBed.inject(EatEffect);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function last() {
    const messages = floats.ownedMessages();

    return messages[messages.length - 1];
  }

  it('anchors the float to the eater', () => {
    effect.handle(eaten({ playerId: 'other' }));

    expect(last().ownerId).toBe('other');
  });

  it('omits the name and plays the eat sound for my own eats', () => {
    effect.handle(eaten({ playerId: 'me', itemType: 'food', delta: 10 }));

    expect(last().who).toBeUndefined();
    expect(eatSound.play).toHaveBeenCalledOnce();
  });

  it('plays the rock thunk for a rock regardless of delta', () => {
    effect.handle(eaten({ itemType: 'rock' as ItemType, delta: 0 }));

    expect(rockSound.play).toHaveBeenCalledOnce();
    expect(eatSound.play).not.toHaveBeenCalled();
  });

  it('plays the brick thunk for a brick regardless of delta', () => {
    effect.handle(eaten({ itemType: 'brick' as ItemType, delta: 0 }));

    expect(brickSound.play).toHaveBeenCalledOnce();
    expect(rockSound.play).not.toHaveBeenCalled();
    expect(eatSound.play).not.toHaveBeenCalled();
  });

  it('plays the bad-eat sound and uses a negative tone for a harmful eat', () => {
    effect.handle(eaten({ itemType: 'rotten', delta: -15 }));

    expect(badEatSound.play).toHaveBeenCalledOnce();
    expect(last().tone).toBe('negative');
  });

  it('labels other players floats with their name and stays silent', () => {
    effect.handle(eaten({ playerId: 'other' }));

    expect(last().who).toBe('Ash');
    expect(eatSound.play).not.toHaveBeenCalled();
  });
});
