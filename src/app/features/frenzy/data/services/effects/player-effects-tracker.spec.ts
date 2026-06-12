import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player, PlayerEffectKind, ServerMessage, ServerState } from '@game/frenzy/types';

import { EasterEggSoundService } from '../sound/easter-egg-sound.service';
import { ShieldSoundService } from '../sound/shield-sound.service';
import { WellFedSoundService } from '../sound/well-fed-sound.service';
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

function granted(playerId: string, kind: PlayerEffectKind = 'shield'): ServerMessage {
  return {
    type: 'effectGranted',
    playerId,
    effect: { kind, expiresAt: 9000 },
    itemId: 'v1',
  };
}

describe('PlayerEffectsTracker', () => {
  let tracker: PlayerEffectsTracker;
  let floats: FloatingMessagesStore;
  let shieldPlay: ReturnType<typeof vi.fn>;
  let wellFedPlay: ReturnType<typeof vi.fn>;
  let layingPlay: ReturnType<typeof vi.fn>;
  let state: ReturnType<typeof signal<ServerState | null>>;

  beforeEach(() => {
    shieldPlay = vi.fn();
    wellFedPlay = vi.fn();
    layingPlay = vi.fn();
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
        { provide: ShieldSoundService, useValue: { play: shieldPlay } },
        { provide: WellFedSoundService, useValue: { play: wellFedPlay } },
        { provide: EasterEggSoundService, useValue: { play: layingPlay } },
      ],
    });
    tracker = TestBed.inject(PlayerEffectsTracker);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  it('floats a shield quip and plays the shield sound for my own grant (no name)', () => {
    tracker.handle(granted('me'));

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].ownerId).toBe('me');
    expect(messages[0].who).toBeUndefined();
    expect(messages[0].textKey).toContain('statusMessage.shield');
    expect(shieldPlay).toHaveBeenCalledOnce();
  });

  it('plays the matching sound per effect kind when the effect lands on me', () => {
    tracker.handle(granted('me', 'laying'));

    const messages = floats.ownedMessages();

    expect(messages[0].textKey).toContain('statusMessage.laying');
    expect(layingPlay).toHaveBeenCalledOnce();
    expect(shieldPlay).not.toHaveBeenCalled();
  });

  it('floats a wellFed quip and plays the wellFed sound for my own vitamin grant', () => {
    tracker.handle(granted('me', 'wellFed'));

    const messages = floats.ownedMessages();

    expect(messages[0].textKey).toContain('statusMessage.wellFed');
    expect(wellFedPlay).toHaveBeenCalledOnce();
    expect(shieldPlay).not.toHaveBeenCalled();
    expect(layingPlay).not.toHaveBeenCalled();
  });

  it('floats a named quip for another player and stays silent (no sound)', () => {
    tracker.handle(granted('other', 'laying'));

    const messages = floats.ownedMessages();

    expect(messages[0].ownerId).toBe('other');
    expect(messages[0].who).toBe('Ash');
    expect(messages[0].textKey).toContain('statusMessage.laying');
    expect(layingPlay).not.toHaveBeenCalled();
  });

  it('ignores non-effect messages', () => {
    tracker.handle({ type: 'fainted', playerId: 'me' });

    expect(floats.ownedMessages()).toHaveLength(0);
    expect(shieldPlay).not.toHaveBeenCalled();
  });
});
