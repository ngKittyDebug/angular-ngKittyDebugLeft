import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player, ServerMessage, ServerState } from '@game/frenzy/types';

import { FrenzyStore } from '../../store/frenzy.store';
import { FloatingMessagesStore } from './floating-messages.store';
import { PresenceTracker } from './presence-tracker.service';

function player(id: string, name: string, x = 0.5, y = 0.5): Player {
  return {
    id,
    name,
    appearance: 'pidgey',
    stage: 1,
    hp: 100,
    x,
    y,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
  };
}

function snapshot(players: Player[]): ServerMessage {
  return { type: 'snapshot', state: { players, items: [], tick: 0 } };
}

describe('PresenceTracker', () => {
  let tracker: PresenceTracker;
  let floats: FloatingMessagesStore;
  let state: ReturnType<typeof signal<ServerState | null>>;

  beforeEach(() => {
    vi.useFakeTimers();
    state = signal<ServerState | null>(null);

    TestBed.configureTestingModule({
      providers: [
        PresenceTracker,
        FloatingMessagesStore,
        { provide: FrenzyStore, useValue: { myId: signal('me'), state } },
      ],
    });
    tracker = TestBed.inject(PresenceTracker);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits no quips for the first snapshot it sees', () => {
    tracker.handle(snapshot([player('me', 'Me'), player('other', 'Ash')]));

    expect(floats.ownedMessages()).toHaveLength(0);
  });

  it('announces a newly appeared other player, not myself', () => {
    tracker.handle(snapshot([player('me', 'Me'), player('other', 'Ash')]));
    tracker.handle(snapshot([player('me', 'Me'), player('other', 'Ash'), player('p3', 'Misty')]));

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].ownerId).toBe('p3');
    expect(messages[0].who).toBe('Misty');
    expect(messages[0].textKey).toContain('statusMessage.appeared');
  });

  it('floats a death quip at the last-known spot when another player faints', () => {
    tracker.handle(snapshot([player('other', 'Ash', 0.4, 0.6)]));
    state.set(null);
    tracker.handle({ type: 'fainted', playerId: 'other' });

    const messages = floats.orphanMessages();
    const died = messages[messages.length - 1];

    expect(died.textKey).toContain('statusMessage.died');
    expect(died.who).toBe('Ash');
    expect(died.x).toBe(0.4);
    expect(died.y).toBe(0.6);
  });

  it('stays silent when my own Pokémon faints', () => {
    tracker.handle(snapshot([player('me', 'Me')]));
    tracker.handle({ type: 'fainted', playerId: 'me' });

    expect(floats.orphanMessages()).toHaveLength(0);
  });
});
