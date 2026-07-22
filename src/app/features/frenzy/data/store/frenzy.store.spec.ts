import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
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
import { bodyForAppearance } from '../constants/pokemon-body';

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
    appearance: ANGRY_BOMB_NPC.appearance,
    body: ANGRY_BOMB_NPC.body,
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

    expect(send).toHaveBeenNthCalledWith(1, { type: 'pokeNpc', npcId: 'bomb' });
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
    expect(send).toHaveBeenNthCalledWith(1, { type: 'identify', sessionToken: 'fresh-token' });
  });
});

describe('FrenzyStore — connection status', () => {
  let messages$: Subject<ServerMessage>;
  let status: ReturnType<typeof signal<string>>;
  let stale: ReturnType<typeof signal<boolean>>;
  let store: InstanceType<typeof FrenzyStore>;

  function setup(): void {
    messages$ = new Subject<ServerMessage>();
    status = signal('connecting');
    stale = signal(false);
    TestBed.configureTestingModule({
      providers: [
        FrenzyStore,
        {
          provide: FrenzySocketService,
          useValue: {
            messages$: messages$.asObservable(),
            status,
            stale,
            connect: vi.fn(),
            disconnect: vi.fn(),
            send: vi.fn(),
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

  it('reports connecting while the socket is opening', () => {
    setup();

    expect(store.connectionStatus()).toBe('connecting');
  });

  it('reports open once the socket is open', () => {
    setup();
    status.set('open');

    expect(store.connectionStatus()).toBe('open');
  });

  it('collapses closed and error into closed', () => {
    setup();
    status.set('closed');
    expect(store.connectionStatus()).toBe('closed');

    status.set('error');
    expect(store.connectionStatus()).toBe('closed');
  });

  it('surfaces a stalled socket as reconnecting, ahead of the raw status', () => {
    setup();
    status.set('open');
    stale.set(true);

    expect(store.connectionStatus()).toBe('reconnecting');
  });

  it('overrides everything with roomFull once the room is full', () => {
    setup();
    status.set('open');
    messages$.next({ type: 'roomFull' });

    expect(store.connectionStatus()).toBe('roomFull');
  });
});

describe('FrenzyStore — outbound commands and local state', () => {
  let messages$: Subject<ServerMessage>;
  let send: ReturnType<typeof vi.fn>;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let saveName: ReturnType<typeof vi.fn>;
  let saveAppearance: ReturnType<typeof vi.fn>;
  let store: InstanceType<typeof FrenzyStore>;

  function setup(): void {
    messages$ = new Subject<ServerMessage>();
    send = vi.fn();
    connect = vi.fn();
    disconnect = vi.fn();
    saveName = vi.fn();
    saveAppearance = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FrenzyStore,
        {
          provide: FrenzySocketService,
          useValue: {
            messages$: messages$.asObservable(),
            status: signal('idle'),
            stale: signal(false),
            connect,
            disconnect,
            send,
          },
        },
        {
          provide: PlayerPersistenceService,
          useValue: { getOrCreateToken: () => 't', saveName, saveAppearance },
        },
      ],
    });
    store = TestBed.inject(FrenzyStore);
  }

  it('sends a click with optional nudge coordinates', () => {
    setup();
    store.click('item-1', 0.2, -0.3);

    expect(send).toHaveBeenNthCalledWith(1, {
      type: 'click',
      itemId: 'item-1',
      nudgeX: 0.2,
      nudgeY: -0.3,
    });
  });

  it('sends a steer command', () => {
    setup();
    store.steer(0.4, 0.6);

    expect(send).toHaveBeenNthCalledWith(1, { type: 'steer', x: 0.4, y: 0.6 });
  });

  it('connect delegates to the socket and clears any stale myId', () => {
    setup();
    messages$.next({ type: 'joined', playerId: 'pub-1' });
    expect(store.myId()).toBe('pub-1');

    store.connect('room-x');

    expect(connect).toHaveBeenNthCalledWith(1, 'room-x');
    expect(store.myId()).toBeNull();
  });

  it('disconnect delegates to the socket', () => {
    setup();
    store.disconnect();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('join persists identity, clears fault state, and sends the join', () => {
    setup();
    const body = bodyForAppearance('pidgey');

    store.join('Ash', 'pidgey', body);

    expect(saveName).toHaveBeenNthCalledWith(1, 'Ash');
    expect(saveAppearance).toHaveBeenNthCalledWith(1, 'pidgey');
    expect(send).toHaveBeenNthCalledWith(1, {
      type: 'join',
      name: 'Ash',
      appearance: 'pidgey',
      body,
    });
  });

  it('records the join refusal reason on joinRejected', () => {
    setup();
    messages$.next({ type: 'joinRejected', reason: 'invalidName' });

    expect(store.joinError()).toBe('invalidName');
  });

  it('clears the join refusal reason on the next join attempt', () => {
    setup();
    messages$.next({ type: 'joinRejected', reason: 'invalidBody' });

    store.join('Ash', 'pidgey', bodyForAppearance('pidgey'));

    expect(store.joinError()).toBeNull();
  });

  it('dismissFainted clears the fainted timestamp', () => {
    setup();
    messages$.next({ type: 'joined', playerId: 'me' });
    messages$.next(snapshot([human('me', 5)]));
    messages$.next({ type: 'fainted', playerId: 'me', cause: { by: 'decay' } });
    expect(store.myFaintedAt()).not.toBeNull();

    store.dismissFainted();

    expect(store.myFaintedAt()).toBeNull();
  });
});

describe('FrenzyStore — fainting obituary', () => {
  let messages$: Subject<ServerMessage>;
  let store: InstanceType<typeof FrenzyStore>;

  function setup(): void {
    messages$ = new Subject<ServerMessage>();
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
            send: vi.fn(),
          },
        },
        {
          provide: PlayerPersistenceService,
          useValue: {
            getOrCreateToken: () => 't',
            rotateToken: vi.fn(),
            saveName: vi.fn(),
            saveAppearance: vi.fn(),
          },
        },
      ],
    });
    store = TestBed.inject(FrenzyStore);
  }

  it('captures the cause and resolves the killer name from the pre-removal snapshot', () => {
    setup();
    messages$.next({ type: 'joined', playerId: 'me' });
    messages$.next(snapshot([human('me', 5), human('rival', 90)]));
    messages$.next({
      type: 'fainted',
      playerId: 'me',
      cause: { by: 'bump', killerId: 'rival' },
    });

    expect(store.myFaintCause()).toEqual({ by: 'bump', killerId: 'rival' });
    expect(store.myKillerName()).toBe('rival');
  });

  it('leaves the killer name null for an unattributed decay death', () => {
    setup();
    messages$.next({ type: 'joined', playerId: 'me' });
    messages$.next(snapshot([human('me', 5)]));
    messages$.next({ type: 'fainted', playerId: 'me', cause: { by: 'decay' } });

    expect(store.myFaintCause()).toEqual({ by: 'decay' });
    expect(store.myKillerName()).toBeNull();
  });

  it('ignores another player fainting — no obituary for someone else', () => {
    setup();
    messages$.next({ type: 'joined', playerId: 'me' });
    messages$.next(snapshot([human('me', 50), human('rival', 5)]));
    messages$.next({ type: 'fainted', playerId: 'rival', cause: { by: 'decay' } });

    expect(store.myFaintedAt()).toBeNull();
    expect(store.myFaintCause()).toBeNull();
  });
});

describe('FrenzyStore — leaderboard and me', () => {
  let messages$: Subject<ServerMessage>;
  let store: InstanceType<typeof FrenzyStore>;

  function setup(): void {
    messages$ = new Subject<ServerMessage>();
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
            send: vi.fn(),
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

  it('ranks alive players by hp and caps the board at five', () => {
    setup();
    messages$.next(
      snapshot([
        human('a', 10),
        human('b', 60),
        human('c', 30),
        human('d', 50),
        human('e', 20),
        human('f', 40),
      ]),
    );

    expect(store.leaderboard().map((p) => p.id)).toEqual(['b', 'd', 'f', 'c', 'e']);
  });

  it('sinks disconnected players below the living regardless of hp', () => {
    setup();
    messages$.next(snapshot([human('ghost', 999, 'disconnected'), human('alive', 10)]));

    expect(store.leaderboard().map((p) => p.id)).toEqual(['alive', 'ghost']);
  });

  it('me returns null until my id matches a player in the snapshot', () => {
    setup();
    messages$.next(snapshot([human('someone', 50)]));
    expect(store.me()).toBeNull();

    messages$.next({ type: 'joined', playerId: 'someone' });

    expect(store.me()?.id).toBe('someone');
  });
});
