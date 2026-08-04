import type * as Party from 'partykit/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { ClientMessage, ServerMessage, ServerState } from '@game/frenzy/types';

import FeedingRoom from '../index';
import { TEST_BODY } from '../../../engine/__tests__/test-body';

const WINDOW = FRENZY.clickRateLimitWindowMs;

class FakeConnection {
  public readonly sent: ServerMessage[] = [];
  public closed = false;

  public constructor(public readonly id: string) {}

  public send(raw: string): void {
    this.sent.push(JSON.parse(raw) as ServerMessage);
  }

  public close(): void {
    this.closed = true;
  }
}

class FakeRoom {
  public readonly id = 'test-room';
  public readonly env: Record<string, unknown> = {};
  public readonly broadcasts: ServerMessage[] = [];

  public broadcast(raw: string): void {
    this.broadcasts.push(JSON.parse(raw) as ServerMessage);
  }
}

function setup(): { room: FakeRoom; server: FeedingRoom } {
  const room = new FakeRoom();
  const server = new FeedingRoom(room as unknown as Party.Room);

  return { room, server };
}

function asParty(conn: FakeConnection): Party.Connection {
  return conn as unknown as Party.Connection;
}

function send(server: FeedingRoom, conn: FakeConnection, message: ClientMessage): void {
  server.onMessage(JSON.stringify(message), asParty(conn));
}

function joinPlayer(server: FeedingRoom, conn: FakeConnection, token: string): void {
  send(server, conn, { type: 'identify', sessionToken: token });
  send(server, conn, {
    type: 'join',
    name: `Trainer-${token}`,
    appearance: 'caterpie',
    body: TEST_BODY,
  });
}

function byType<T extends ServerMessage['type']>(
  room: FakeRoom,
  type: T,
): Extract<ServerMessage, { type: T }>[] {
  return room.broadcasts.filter(
    (message): message is Extract<ServerMessage, { type: T }> => message.type === type,
  );
}

function latestSnapshot(room: FakeRoom): Extract<ServerMessage, { type: 'snapshot' }> | undefined {
  return byType(room, 'snapshot').at(-1);
}

function humanPlayers(room: FakeRoom): ServerState['players'] {
  return latestSnapshot(room)?.state.players.filter((player) => player.kind === 'human') ?? [];
}

// The private session map, read the way a test (not the wire) can — the token↔session store never rides any frame,
// so its growth is only observable here. `any` is banned even in these specs, hence the narrow structural cast.
function sessionCount(server: FeedingRoom): number {
  return (server as unknown as { sessions: Map<string, unknown> }).sessions.size;
}

describe('FeedingRoom — session hardening (issues #323, #324)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Keep the NPC spawn window far beyond every scenario here so the autobot never enters `players[]` and skews
    // the human-roster / cap assertions (no ticks are advanced in most tests, but this is belt-and-braces).
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rejects a join once the roster is at maxPlayers, even from an already-identified socket', () => {
    const { room, server } = setup();

    // The attacker connects and identifies while the room is still empty (so onConnect accepts it) — proving the
    // cap has to live in handleJoin, since onConnect's spectator check can no longer stop this socket from joining.
    const attacker = new FakeConnection('attacker');

    server.onConnect(asParty(attacker));
    send(server, attacker, { type: 'identify', sessionToken: 'attacker-token' });

    // Fill every seat with legitimate players on their own connections.
    for (let i = 0; i < FRENZY.maxPlayers; i += 1) {
      const filler = new FakeConnection(`filler-${i}`);

      server.onConnect(asParty(filler));
      joinPlayer(server, filler, `filler-token-${i}`);
    }

    expect(humanPlayers(room)).toHaveLength(FRENZY.maxPlayers);

    // The already-identified attacker now tries to grab a seat past the cap.
    send(server, attacker, {
      type: 'join',
      name: 'Overflow',
      appearance: 'caterpie',
      body: TEST_BODY,
    });

    expect(attacker.sent.some((message) => message.type === 'roomFull')).toBe(true);
    expect(attacker.sent.some((message) => message.type === 'joined')).toBe(false);
    // The roster stayed capped — the overflow join added nobody.
    expect(latestSnapshot(room)?.state.players).toHaveLength(FRENZY.maxPlayers);
  });

  it('evicts orphaned sessions so repeated identify with fresh tokens does not grow the session map', () => {
    const { server } = setup();
    const conn = new FakeConnection('churn');

    server.onConnect(asParty(conn));

    // Re-identify with a brand-new token many times over, spacing each past the rate-limit window so the limiter
    // never masks the leak — every identify is processed, isolating the eviction of the abandoned prior session.
    for (let i = 0; i < 40; i += 1) {
      vi.advanceTimersByTime(WINDOW + 1);
      send(server, conn, { type: 'identify', sessionToken: `token-${i}` });
    }

    // Each fresh identify re-keys the connection and abandons its prior (player-less) session — which must be
    // dropped, not accumulated. Without eviction this would be 40.
    expect(sessionCount(server)).toBe(1);
  });

  it('rate-limits a rejoin-churn flood on one connection without locking out other connections', () => {
    const { room, server } = setup();
    const flood = new FakeConnection('flood');

    server.onConnect(asParty(flood));

    // The re-key guard pins a socket to one seat, so the only flood left is churning that seat: leave, re-identify
    // with a fresh token, join, over and over. Frozen time = one rate-limit window; identify+join each spend one
    // control-plane token (2 per cycle), so at most `floor(clickRateLimitMax / 2)` joins can land — createPlayer /
    // separatePlayers can't be driven unbounded. `joined` is sent only on a real join here, so it counts the churn.
    for (let i = 0; i < FRENZY.maxPlayers + 10; i += 1) {
      send(server, flood, { type: 'leave' });
      joinPlayer(server, flood, `flood-token-${i}`);
    }

    const joins = flood.sent.filter((message) => message.type === 'joined').length;

    expect(joins).toBe(Math.floor(FRENZY.clickRateLimitMax / 2));
    expect(joins).toBeLessThan(FRENZY.maxPlayers);

    // The per-connection budget does not leak across sockets: a fresh connection joins immediately.
    const legit = new FakeConnection('legit');

    server.onConnect(asParty(legit));
    joinPlayer(server, legit, 'legit-token');

    expect(legit.sent.some((message) => message.type === 'joined')).toBe(true);
    expect(humanPlayers(room).some((player) => player.status === 'alive')).toBe(true);
  });

  it('pins one socket to a single seat when it loops identify(fresh token)+join across rate windows', () => {
    const { room, server } = setup();
    const attacker = new FakeConnection('phantom');

    server.onConnect(asParty(attacker));

    // Jump the clock past the rate-limit window between each pair with setSystemTime (NOT advanceTimersByTime), so
    // the game loop never fires and only the re-key guard is under test — the limiter can't mask it. Without the
    // guard each fresh token would abandon the prior live player as a connection-less phantom (alive, no grace
    // timer), letting this ONE socket stack seats up to maxPlayers and lock the room for everyone else.
    let clock = Date.now();

    for (let i = 0; i < FRENZY.maxPlayers + 5; i += 1) {
      clock += WINDOW + 1;
      vi.setSystemTime(clock);
      joinPlayer(server, attacker, `phantom-token-${i}`);
    }

    // Every re-key onto a fresh token while its player is alive is rejected, so the roster never grows past one and
    // no phantom sessions pile up behind it.
    expect(humanPlayers(room).length).toBe(1);
    expect(attacker.sent.some((message) => message.type === 'identifyRejected')).toBe(true);
    expect(sessionCount(server)).toBe(1);
  });

  it('reaps a graced session when its disconnected player faints before the grace window fires', () => {
    const { server } = setup();
    const conn = new FakeConnection('grace-leak');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'grace-token');

    // Owner drops: the player is greyed into the grace window and its session is kept to hold the seat.
    server.onClose(asParty(conn));
    expect(sessionCount(server)).toBe(1);

    // A disconnected seat still bleeds decay and can faint before its 60s grace fires (applyDecayStep ignores
    // status). Drop its hp so the next decay step is fatal, then run past two decay intervals (the spawn shield
    // pauses decay for the first one): the faint must reap the orphaned session, not leave it to outlive its player.
    (server as unknown as { players: { hp: number }[] }).players[0].hp = FRENZY.decayPerTick;

    vi.advanceTimersByTime(FRENZY.decayIntervalMs * 2 + 1);

    expect(sessionCount(server)).toBe(0);
  });

  it('keeps a disconnected player restorable while another connection spams fresh-token identifies', () => {
    const { room, server } = setup();
    const first = new FakeConnection('first');

    server.onConnect(asParty(first));
    joinPlayer(server, first, 'returning-token');

    const restoredId = latestSnapshot(room)?.state.players.find(
      (player) => player.kind === 'human',
    )?.id;

    expect(restoredId).toBeDefined();

    // The owner drops — the player enters the grace window (still seated, greyed out).
    server.onClose(asParty(first));
    expect(latestSnapshot(room)?.state.players[0].status).toBe('disconnected');

    // An attacker churns sessions on a separate socket. The eviction must stay surgical: the grace session that
    // still holds `returning-token`'s player must survive this, or reconnection would silently break.
    const attacker = new FakeConnection('attacker');

    server.onConnect(asParty(attacker));

    for (let i = 0; i < 5; i += 1) {
      vi.advanceTimersByTime(WINDOW + 1);
      send(server, attacker, { type: 'identify', sessionToken: `evict-me-${i}` });
    }

    // The original owner reconnects with the SAME token on a fresh socket and is restored.
    const second = new FakeConnection('second');

    server.onConnect(asParty(second));
    send(server, second, { type: 'identify', sessionToken: 'returning-token' });

    expect(byType(room, 'rejoined').some((message) => message.playerId === restoredId)).toBe(true);
    expect(second.sent.some((message) => message.type === 'joined')).toBe(true);
    expect(
      latestSnapshot(room)?.state.players.find((player) => player.id === restoredId)?.status,
    ).toBe('alive');
  });
});
