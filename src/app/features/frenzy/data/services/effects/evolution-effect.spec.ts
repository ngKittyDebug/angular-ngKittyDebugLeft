import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player, ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { effectContext } from './effect-context.mock';
import { EvolutionEffect } from './evolution-effect.service';
import { FloatingMessagesStore } from './floating-messages.store';

function player(id: string): Player {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 2,
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

function evolved(playerId: string): ServerMessage {
  return { type: 'evolved', playerId, newStage: 2 };
}

describe('EvolutionEffect', () => {
  let effect: EvolutionEffect;
  let floats: FloatingMessagesStore;
  let play: ReturnType<typeof vi.fn>;
  const context = effectContext({
    myId: 'me',
    state: { players: [player('me'), player('other')], items: [], tick: 0 },
  });

  beforeEach(() => {
    vi.useFakeTimers();
    play = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        EvolutionEffect,
        FloatingMessagesStore,
        { provide: SoundPlayerService, useValue: { play } },
      ],
    });
    effect = TestBed.inject(EvolutionEffect);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags any evolving player for the scene flash', () => {
    effect.handle(evolved('other'), context);

    expect(effect.evolvingPlayers().has('other')).toBe(true);
  });

  it('clears the flash flag after the animation window', () => {
    effect.handle(evolved('other'), context);

    vi.advanceTimersByTime(1500);

    expect(effect.evolvingPlayers().has('other')).toBe(false);
  });

  it('plays the chime and floats an evolved quip for my own evolution', () => {
    effect.handle(evolved('me'), context);

    const messages = floats.ownedMessages();

    expect(play).toHaveBeenCalledExactlyOnceWith('evolve');
    expect(messages[messages.length - 1].ownerId).toBe('me');
    expect(messages[messages.length - 1].textKey).toContain('statusMessage.evolved');
  });

  it('stays silent for another player`s evolution, only flagging the flash', () => {
    effect.handle(evolved('other'), context);

    expect(play).not.toHaveBeenCalled();
    expect(floats.ownedMessages()).toHaveLength(0);
  });

  it('ignores messages other than evolved', () => {
    effect.handle({ type: 'roomFull' }, context);

    expect(effect.evolvingPlayers().size).toBe(0);
  });
});
