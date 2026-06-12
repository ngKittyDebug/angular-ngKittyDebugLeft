import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ItemType, ServerMessage } from '@game/frenzy/types';

import { FrenzyStatsStore } from './frenzy-stats.store';
import { FrenzyStore } from './frenzy.store';
import { FrenzySocketService } from '../services/frenzy-socket.service';

function eaten(playerId: string, itemType: ItemType, newHp: number): ServerMessage {
  return {
    type: 'eaten',
    itemId: 'i',
    itemType,
    playerId,
    newHp,
    delta: 10,
    x: 0.5,
    y: 0.5,
    via: 'click',
  };
}

describe('FrenzyStatsStore', () => {
  let messages$: Subject<ServerMessage>;
  let store: InstanceType<typeof FrenzyStatsStore>;

  beforeEach(() => {
    messages$ = new Subject<ServerMessage>();
    TestBed.configureTestingModule({
      providers: [
        FrenzyStatsStore,
        { provide: FrenzySocketService, useValue: { messages$: messages$.asObservable() } },
        { provide: FrenzyStore, useValue: { myId: signal('t1') } },
      ],
    });
    store = TestBed.inject(FrenzyStatsStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores events that arrive before a session starts', () => {
    messages$.next(eaten('t1', 'food', 110));

    expect(store.totalEaten()).toBe(0);
    expect(store.maxHp()).toBe(0);
  });

  it('counts eaten items by type and tracks peak hp for my player', () => {
    store.startSession();
    messages$.next(eaten('t1', 'food', 110));
    messages$.next(eaten('t1', 'food', 120));
    messages$.next(eaten('t1', 'rareCandy', 150));
    messages$.next(eaten('t1', 'rareCandy', 140));

    expect(store.eatenByType()).toEqual({
      food: 2,
      rotten: 0,
      rock: 0,
      brick: 0,
      rareCandy: 2,
      bomb: 0,
      goldenBerry: 0,
      crumb: 0,
      mushroom: 0,
      vitamin: 0,
      shield: 0,
      easterEgg: 0,
      poop: 0,
    });
    expect(store.totalEaten()).toBe(4);
    expect(store.maxHp()).toBe(150);
  });

  it('ignores events for other players', () => {
    store.startSession();
    messages$.next(eaten('other', 'food', 999));

    expect(store.totalEaten()).toBe(0);
    expect(store.maxHp()).toBe(100);
  });

  it('records the highest reached stage on evolved', () => {
    store.startSession();
    messages$.next({ type: 'evolved', playerId: 't1', newStage: 2 });

    expect(store.maxStage()).toBe(2);

    messages$.next({ type: 'evolved', playerId: 'other', newStage: 3 });

    expect(store.maxStage()).toBe(2);
  });

  it('freezes lifespan when my player faints', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    store.startSession();
    vi.setSystemTime(5000);
    messages$.next({ type: 'fainted', playerId: 't1' });

    expect(store.lifespanSeconds()).toBe(5);
  });

  it('resets accumulated stats on a new session', () => {
    store.startSession();
    messages$.next(eaten('t1', 'food', 130));
    store.startSession();

    expect(store.totalEaten()).toBe(0);
    expect(store.maxHp()).toBe(100);
    expect(store.maxStage()).toBe(1);
  });
});
