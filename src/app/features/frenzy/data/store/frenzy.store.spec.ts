import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ANGRY_BOMB } from '@game/frenzy/npc/angry-bomb';
import type {
  HumanPlayer,
  NpcPlayer,
  Player,
  PlayerStatus,
  ServerMessage,
  ServerState,
} from '@game/frenzy/types';

import { FrenzyStore } from './frenzy.store';
import { FrenzySocketService } from '../services/frenzy-socket.service';
import { PlayerPersistenceService } from '../services/player-persistence.service';
import { bodyForAppearance } from '../../ui/constants/pokemon-registry';

function human(id: string, hp: number, status: PlayerStatus = 'alive'): HumanPlayer {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 1,
    hp,
    mana: 0,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status,
    disconnectedAt: status === 'disconnected' ? 0 : null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

function bombNpc(id: string, hp: number): NpcPlayer {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id,
    name: 'Angry Bomb',
    appearance: ANGRY_BOMB.appearance,
    body: ANGRY_BOMB.body,
    stage: 1,
    hp,
    mana: 0,
    x: 0.5,
    y: 0.9,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

function snapshot(players: Player[]): ServerMessage {
  const state: ServerState = { players, items: [], tick: 0 };

  return { type: 'snapshot', state };
}

describe('FrenzyStore — NPC excluded from human-facing UI (D11)', () => {
  let messages$: Subject<ServerMessage>;
  let send: ReturnType<typeof vi.fn>;
  let store: InstanceType<typeof FrenzyStore>;

  function setup(): void {
    messages$ = new Subject<ServerMessage>();
    send = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FrenzyStore,
        {
          provide: FrenzySocketService,
          useValue: {
            messages$: messages$.asObservable(),
            status: signal('open'),
            stale: signal(false),
            connect: vi.fn(),
            disconnect: vi.fn(),
            send,
          },
        },
        {
          provide: PlayerPersistenceService,
          useValue: { getOrCreateToken: () => 't', saveName: vi.fn(), saveAppearance: vi.fn() },
        },
      ],
    });
    store = TestBed.inject(FrenzyStore);
  }

  it('keeps the NPC out of the leaderboard even when it out-hps everyone', () => {
    setup();
    messages$.next(snapshot([human('a', 50), bombNpc('bomb', 999), human('b', 30)]));

    expect(store.leaderboard().map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('counts only humans in presenceCount', () => {
    setup();
    messages$.next(snapshot([human('a', 50), bombNpc('bomb', 100), human('b', 30)]));

    expect(store.presenceCount()).toBe(2);
  });

  it('counts only disconnected humans in disconnectedCount', () => {
    setup();
    messages$.next(snapshot([human('a', 50, 'disconnected'), bombNpc('bomb', 100)]));

    expect(store.disconnectedCount()).toBe(1);
  });

  it('never crowns the NPC and does not count it toward the ≥2-alive gate', () => {
    setup();
    // One human + the NPC: the NPC must not count as the second alive, so no crown shows.
    messages$.next(snapshot([human('a', 50), bombNpc('bomb', 999)]));
    expect(store.crownId()).toBeNull();

    // Two humans: the higher-hp human wins, the NPC (highest hp overall) is ignored.
    messages$.next(snapshot([human('a', 80), human('b', 30), bombNpc('bomb', 999)]));
    expect(store.crownId()).toBe('a');
  });

  it('sends a pokeNpc message', () => {
    setup();
    store.pokeNpc('bomb');

    expect(send).toHaveBeenCalledWith({ type: 'pokeNpc', npcId: 'bomb' });
  });
});

describe('FrenzyStore — session identity (issue #124)', () => {
  let messages$: Subject<ServerMessage>;
  let send: ReturnType<typeof vi.fn>;
  let rotateToken: ReturnType<typeof vi.fn>;
  let store: InstanceType<typeof FrenzyStore>;

  function setup(): void {
    messages$ = new Subject<ServerMessage>();
    send = vi.fn();
    rotateToken = vi.fn(() => 'fresh-token');
    TestBed.configureTestingModule({
      providers: [
        FrenzyStore,
        {
          provide: FrenzySocketService,
          useValue: {
            messages$: messages$.asObservable(),
            status: signal('open'),
            stale: signal(false),
            connect: vi.fn(),
            disconnect: vi.fn(),
            send,
          },
        },
        {
          provide: PlayerPersistenceService,
          useValue: {
            getOrCreateToken: () => 'secret-token',
            rotateToken,
            saveName: vi.fn(),
            saveAppearance: vi.fn(),
          },
        },
      ],
    });
    store = TestBed.inject(FrenzyStore);
  }

  it('adopts the public id from the joined ack — myId is never the session token', () => {
    setup();
    messages$.next({ type: 'joined', playerId: 'pub-1' });
    messages$.next(snapshot([human('pub-1', 80), human('other', 50)]));

    expect(store.myId()).toBe('pub-1');
    expect(store.me()?.id).toBe('pub-1');
  });

  it('rotates the token and re-identifies when the server rejects identify', () => {
    setup();
    messages$.next({ type: 'identifyRejected' });

    expect(rotateToken).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ type: 'identify', sessionToken: 'fresh-token' });
  });
});
