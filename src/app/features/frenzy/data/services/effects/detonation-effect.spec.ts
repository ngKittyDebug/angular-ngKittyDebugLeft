import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import { DetonationEffect } from './detonation-effect.service';
import { FloatingMessagesStore } from './floating-messages.store';

function detonated(
  partial: Partial<Extract<ServerMessage, { type: 'detonated' }>> = {},
): ServerMessage {
  return {
    type: 'detonated',
    itemId: 'bomb-1',
    x: 0.5,
    y: 0.5,
    radius: 0.2,
    hits: [],
    ...partial,
  };
}

describe('DetonationEffect', () => {
  let effect: DetonationEffect;
  let floats: FloatingMessagesStore;
  let play: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    play = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        DetonationEffect,
        FloatingMessagesStore,
        { provide: SoundPlayerService, useValue: { play } },
      ],
    });
    effect = TestBed.inject(DetonationEffect);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays the explosion sound and adds a blast ring at the blast point', () => {
    effect.handle(detonated({ x: 0.3, y: 0.7, radius: 0.25 }));

    expect(play).toHaveBeenCalledExactlyOnceWith('explosion');
    expect(effect.blasts()).toHaveLength(1);
    expect(effect.blasts()[0]).toMatchObject({ x: 0.3, y: 0.7, radius: 0.25 });
  });

  it('floats one negative-toned damage quip per hit, anchored to each victim', () => {
    effect.handle(
      detonated({
        hits: [
          { playerId: 'a', delta: -25 },
          { playerId: 'b', delta: -10 },
        ],
      }),
    );

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.ownerId)).toEqual(['a', 'b']);
    expect(messages.every((message) => message.tone === 'negative')).toBe(true);
  });

  it('carries each victim`s exact lost hp on its float', () => {
    effect.handle(detonated({ hits: [{ playerId: 'a', delta: -25 }] }));

    expect(floats.ownedMessages()[0].delta).toBe(-25);
  });

  it('caps simultaneous blasts at three, dropping the oldest', () => {
    for (let i = 0; i < 4; i++) {
      effect.handle(detonated({ x: i / 10 }));
    }

    const xs = effect.blasts().map((blast) => blast.x);

    expect(effect.blasts()).toHaveLength(3);
    expect(xs).toEqual([0.1, 0.2, 0.3]);
  });

  it('ignores messages other than detonated', () => {
    effect.handle({ type: 'roomFull' });

    expect(play).not.toHaveBeenCalled();
    expect(effect.blasts()).toHaveLength(0);
  });
});
