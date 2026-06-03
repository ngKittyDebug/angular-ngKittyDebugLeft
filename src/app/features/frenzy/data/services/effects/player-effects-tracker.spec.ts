import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player, ServerMessage, ServerState } from '@game/frenzy/types';

import { ShieldSoundService } from '../sound/shield-sound.service';
import { SoundSettingsService } from '../sound/sound-settings.service';
import { FrenzyStore } from '../../store/frenzy.store';
import { FloatingMessagesStore } from './floating-messages.store';
import { PlayerEffectsTracker } from './player-effects-tracker.service';

function player(id: string, name: string): Player {
  return {
    id,
    name,
    appearance: 'pidgey',
    stage: 1,
    mass: 100,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
  };
}

function granted(playerId: string): ServerMessage {
  return {
    type: 'effectGranted',
    playerId,
    effect: { kind: 'shield', expiresAt: 9000 },
    itemId: 'v1',
  };
}

describe('PlayerEffectsTracker', () => {
  let tracker: PlayerEffectsTracker;
  let floats: FloatingMessagesStore;
  let play: ReturnType<typeof vi.fn>;
  let state: ReturnType<typeof signal<ServerState | null>>;

  beforeEach(() => {
    play = vi.fn();
    state = signal<ServerState | null>({
      players: [player('me', 'Me'), player('other', 'Ash')],
      items: [],
      tick: 0,
    });

    TestBed.configureTestingModule({
      providers: [
        PlayerEffectsTracker,
        FloatingMessagesStore,
        { provide: FrenzyStore, useValue: { myId: signal('me'), state } },
        { provide: SoundSettingsService, useValue: { enabled: signal(true) } },
        { provide: ShieldSoundService, useValue: { play } },
      ],
    });
    tracker = TestBed.inject(PlayerEffectsTracker);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  it('floats a shield quip and plays the sound for my own grant (no name)', () => {
    tracker.handle(granted('me'));

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].ownerId).toBe('me');
    expect(messages[0].who).toBeUndefined();
    expect(messages[0].textKey).toContain('statusMessage.shield');
    expect(play).toHaveBeenCalledOnce();
  });

  it('floats a named quip for another player and stays silent (no sound)', () => {
    tracker.handle(granted('other'));

    const messages = floats.ownedMessages();

    expect(messages[0].ownerId).toBe('other');
    expect(messages[0].who).toBe('Ash');
    expect(play).not.toHaveBeenCalled();
  });

  it('ignores non-effect messages', () => {
    tracker.handle({ type: 'fainted', playerId: 'me' });

    expect(floats.ownedMessages()).toHaveLength(0);
    expect(play).not.toHaveBeenCalled();
  });
});
