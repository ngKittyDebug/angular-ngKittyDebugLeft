import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ItemType, Player, ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { EatEffect } from './eat-effect.service';
import { effectContext } from './effect-context.mock';
import { FloatingMessagesStore } from './floating-messages.store';

function player(id: string, name: string): Player {
  return {
    kind: 'human',
    id,
    name,
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 1,
    hp: 100,
    mana: 0,
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

function npcPlayer(id: string): Player {
  return {
    ...player(id, 'angryBomb'),
    kind: 'npc',
    npcKind: 'angryBomb',
    appearance: 'angryBomb',
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
  // The per-effect sound services collapsed into one data-driven facade; specs now mock that facade and assert
  // the `SoundKind` it was asked to play (issue 08 accepted trade-off — no more per-sound module mocks).
  let play: ReturnType<typeof vi.fn>;
  const context = effectContext({
    myId: 'me',
    state: { players: [player('other', 'Ash'), npcPlayer('npc-1')], items: [], tick: 0 },
  });

  beforeEach(() => {
    vi.useFakeTimers();
    play = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        EatEffect,
        FloatingMessagesStore,
        { provide: SoundPlayerService, useValue: { play } },
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
    effect.handle(eaten({ playerId: 'other' }), context);

    expect(last().ownerId).toBe('other');
  });

  it('omits the name and plays the eat sound for my own eats', () => {
    effect.handle(eaten({ playerId: 'me', itemType: 'food', delta: 10 }), context);

    expect(last().who).toBeUndefined();
    expect(play).toHaveBeenCalledExactlyOnceWith('eat');
  });

  it('plays the rock thunk for a rock regardless of delta', () => {
    effect.handle(eaten({ itemType: 'rock' as ItemType, delta: 0 }), context);

    expect(play).toHaveBeenCalledExactlyOnceWith('rock');
  });

  it('plays the brick thunk for a brick regardless of delta', () => {
    effect.handle(eaten({ itemType: 'brick' as ItemType, delta: 0 }), context);

    expect(play).toHaveBeenCalledExactlyOnceWith('brick');
  });

  it('plays the bad-eat sound and uses a negative tone for a harmful eat', () => {
    effect.handle(eaten({ itemType: 'rotten', delta: -15 }), context);

    expect(play).toHaveBeenCalledExactlyOnceWith('badEat');
    expect(last().tone).toBe('negative');
  });

  it('labels other players floats with their name and stays silent', () => {
    effect.handle(eaten({ playerId: 'other' }), context);

    expect(last().who).toBe('Ash');
    expect(play).not.toHaveBeenCalled();
  });

  it('omits the name on the NPC eater float (its name is the internal appearance id)', () => {
    effect.handle(eaten({ playerId: 'npc-1' }), context);

    expect(last().ownerId).toBe('npc-1');
    expect(last().who).toBeUndefined();
  });
});
