import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player, PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { effectContext } from './effect-context.mock';
import { FloatingMessagesStore } from './floating-messages.store';
import { PlayerEffectsTracker } from './player-effects-tracker.service';

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

function granted(playerId: string, kind: PlayerEffectKind = 'shield'): ServerMessage {
  return {
    type: 'effectGranted',
    playerId,
    effect: { kind, expiresAt: 9000 },
    itemId: 'v1',
    x: 0.5,
    y: 0.5,
    via: 'click',
  };
}

describe('PlayerEffectsTracker', () => {
  let tracker: PlayerEffectsTracker;
  let floats: FloatingMessagesStore;
  // The per-effect sound services collapsed into one data-driven facade; specs mock that facade and assert the
  // `SoundKind` it was asked to play (issue 08 accepted trade-off — no more per-sound module mocks).
  let play: ReturnType<typeof vi.fn>;
  const context = effectContext({
    myId: 'me',
    state: { players: [player('me', 'Me'), player('other', 'Ash')], items: [], tick: 0 },
  });

  beforeEach(() => {
    play = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        PlayerEffectsTracker,
        FloatingMessagesStore,
        { provide: SoundPlayerService, useValue: { play } },
      ],
    });
    tracker = TestBed.inject(PlayerEffectsTracker);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  it('floats a shield quip and plays the shield sound for my own grant (no name)', () => {
    tracker.handle(granted('me'), context);

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].ownerId).toBe('me');
    expect(messages[0].who).toBeUndefined();
    expect(messages[0].textKey).toContain('statusMessage.shield');
    expect(play).toHaveBeenCalledExactlyOnceWith('shield');
  });

  it('plays the matching sound per effect kind when the effect lands on me', () => {
    tracker.handle(granted('me', 'laying'), context);

    const messages = floats.ownedMessages();

    expect(messages[0].textKey).toContain('statusMessage.laying');
    expect(play).toHaveBeenCalledExactlyOnceWith('easterEgg');
  });

  it('floats a pooping quip and plays the poop-eat sound for my own poop grant', () => {
    tracker.handle(granted('me', 'pooping'), context);

    const messages = floats.ownedMessages();

    expect(messages[0].textKey).toContain('statusMessage.pooping');
    expect(play).toHaveBeenCalledExactlyOnceWith('poopEat');
  });

  it('floats a wellFed quip and plays the wellFed sound for my own vitamin grant', () => {
    tracker.handle(granted('me', 'wellFed'), context);

    const messages = floats.ownedMessages();

    expect(messages[0].textKey).toContain('statusMessage.wellFed');
    expect(play).toHaveBeenCalledExactlyOnceWith('wellFed');
  });

  it('floats a cactus quip and reuses the shield sound for my own cactus grant', () => {
    tracker.handle(granted('me', 'cactus'), context);

    const messages = floats.ownedMessages();

    expect(messages[0].textKey).toContain('statusMessage.cactus');
    expect(play).toHaveBeenCalledExactlyOnceWith('shield');
  });

  it('floats a named quip for another player and stays silent (no sound)', () => {
    tracker.handle(granted('other', 'laying'), context);

    const messages = floats.ownedMessages();

    expect(messages[0].ownerId).toBe('other');
    expect(messages[0].who).toBe('Ash');
    expect(messages[0].textKey).toContain('statusMessage.laying');
    expect(play).not.toHaveBeenCalled();
  });

  it('ignores non-effect messages', () => {
    tracker.handle({ type: 'fainted', playerId: 'me' }, context);

    expect(floats.ownedMessages()).toHaveLength(0);
    expect(play).not.toHaveBeenCalled();
  });
});
