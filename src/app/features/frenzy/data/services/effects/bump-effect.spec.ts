import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerMessage } from '@game/frenzy/types';

import { BumpEffect } from './bump-effect.service';
import { FloatingMessagesStore } from './floating-messages.store';

function bumped(partial: Partial<Extract<ServerMessage, { type: 'bumped' }>> = {}): ServerMessage {
  return {
    type: 'bumped',
    playerId: 'victim',
    amount: -5,
    ...partial,
  };
}

describe('BumpEffect', () => {
  let effect: BumpEffect;
  let floats: FloatingMessagesStore;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [BumpEffect, FloatingMessagesStore],
    });
    effect = TestBed.inject(BumpEffect);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function last() {
    const messages = floats.ownedMessages();

    return messages[messages.length - 1];
  }

  it('anchors the bump float to the player that took the hit', () => {
    effect.handle(bumped({ playerId: 'victim' }));

    expect(last().ownerId).toBe('victim');
  });

  it('floats a negative-toned bump quip carrying the lost hp', () => {
    effect.handle(bumped({ amount: -15 }));

    expect(last().tone).toBe('negative');
    expect(last().delta).toBe(-15);
  });

  it('passes a server-stamped priority through to the float', () => {
    effect.handle(bumped({ priority: 77 }));

    expect(last().priority).toBe(77);
  });

  it('ignores messages other than bumped', () => {
    effect.handle({ type: 'roomFull' });

    expect(floats.ownedMessages()).toHaveLength(0);
  });
});
