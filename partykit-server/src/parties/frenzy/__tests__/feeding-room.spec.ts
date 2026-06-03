import type * as Party from 'partykit/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GAME } from '@game/frenzy/constants';
import type { ClientMessage, ServerMessage } from '@game/frenzy/types';

import FeedingRoom from '../index';

const TICK_MS = 1000 / GAME.tickRateHz;

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
  send(server, conn, { type: 'join', name: `Trainer-${token}`, appearance: 'caterpie' });
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

describe('FeedingRoom orchestration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rejects connections beyond maxPlayers with roomFull and closes them', () => {
    const { room, server } = setup();

    for (let i = 0; i < GAME.maxPlayers; i += 1) {
      const conn = new FakeConnection(`c${i}`);

      server.onConnect(asParty(conn));
      joinPlayer(server, conn, `t${i}`);
    }

    const overflow = new FakeConnection('overflow');

    server.onConnect(asParty(overflow));

    expect(overflow.closed).toBe(true);
    expect(overflow.sent.some((message) => message.type === 'roomFull')).toBe(true);
    expect(latestSnapshot(room)?.state.players).toHaveLength(GAME.maxPlayers);
  });

  it('lets a player eat a spawned item (click path works end to end)', () => {
    // Pin the spawn roll to food — without it the random type can be a bomb/vitamin, which is batted/granted
    // rather than eaten, so no `eaten` event is emitted and the assertion below flakes.
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    vi.advanceTimersByTime(TICK_MS);
    const spawned = byType(room, 'spawned');

    expect(spawned).toHaveLength(1);

    send(server, conn, { type: 'click', itemId: spawned[0].item.id });

    const eaten = byType(room, 'eaten');

    expect(eaten).toHaveLength(1);
    expect(eaten[0].playerId).toBe('token-1');
    expect(eaten[0].itemId).toBe(spawned[0].item.id);
  });

  it('shares the click budget across tabs of the same session (no rate-limit bypass)', () => {
    const { room, server } = setup();
    const tabA = new FakeConnection('tab-a');
    const tabB = new FakeConnection('tab-b');

    server.onConnect(asParty(tabA));
    joinPlayer(server, tabA, 'shared-token');
    server.onConnect(asParty(tabB));
    send(server, tabB, { type: 'identify', sessionToken: 'shared-token' });

    vi.advanceTimersByTime(TICK_MS);
    const item = byType(room, 'spawned')[0].item;

    // Exhaust the shared per-session budget through tab A on a non-existent item.
    for (let i = 0; i < GAME.clickRateLimitMax; i += 1) {
      send(server, tabA, { type: 'click', itemId: 'ghost' });
    }

    // Tab B tries to grab a real item — must be blocked by the shared budget.
    send(server, tabB, { type: 'click', itemId: item.id });

    expect(byType(room, 'eaten')).toHaveLength(0);
  });

  it('marks a player disconnected on close and purges them after the grace period', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    server.onClose(asParty(conn));

    const afterClose = latestSnapshot(room);

    expect(afterClose?.state.players[0].status).toBe('disconnected');

    vi.advanceTimersByTime(GAME.graceMs + TICK_MS);

    expect(latestSnapshot(room)?.state.players).toHaveLength(0);
  });

  it('restores a disconnected player on reconnect and emits rejoined', () => {
    const { room, server } = setup();
    const first = new FakeConnection('first');

    server.onConnect(asParty(first));
    joinPlayer(server, first, 'token-1');
    server.onClose(asParty(first));

    const second = new FakeConnection('second');

    server.onConnect(asParty(second));
    send(server, second, { type: 'identify', sessionToken: 'token-1' });

    expect(byType(room, 'rejoined').some((message) => message.playerId === 'token-1')).toBe(true);
    expect(latestSnapshot(room)?.state.players[0].status).toBe('alive');

    // Grace timer was cancelled — advancing past it must not purge the restored player.
    vi.advanceTimersByTime(GAME.graceMs + TICK_MS);

    expect(latestSnapshot(room)?.state.players).toHaveLength(1);
  });

  it('stops the game loop once the last player leaves', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    vi.advanceTimersByTime(TICK_MS * 3);
    expect(room.broadcasts.length).toBeGreaterThan(0);

    send(server, conn, { type: 'leave' });
    const frozen = room.broadcasts.length;

    vi.advanceTimersByTime(TICK_MS * 10);

    expect(room.broadcasts.length).toBe(frozen);
  });

  it('stops the game loop when the last player dies from decay', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    // Force every spawn to rock (a non-feeding type — collisions only damage) so falling items can't
    // passively feed the idle player — decay must drain startingMass to 0 and faint the last player.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    const toDeathMs =
      GAME.decayIntervalMs * (GAME.startingMass / GAME.decayPerTick) + GAME.decayIntervalMs;

    vi.advanceTimersByTime(toDeathMs);

    expect(byType(room, 'fainted').some((message) => message.playerId === 'token-1')).toBe(true);
    expect(latestSnapshot(room)?.state.players).toHaveLength(0);

    const frozen = room.broadcasts.length;

    vi.advanceTimersByTime(TICK_MS * 10);

    expect(room.broadcasts.length).toBe(frozen);
  });

  it('restarts the loop when a player joins after the room emptied via death', () => {
    const { room, server } = setup();
    const first = new FakeConnection('c1');

    // Rock-only spawns can't passively feed the idle player (see decay-death test above).
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    server.onConnect(asParty(first));
    joinPlayer(server, first, 'token-1');

    const toDeathMs =
      GAME.decayIntervalMs * (GAME.startingMass / GAME.decayPerTick) + GAME.decayIntervalMs;

    vi.advanceTimersByTime(toDeathMs);
    expect(latestSnapshot(room)?.state.players).toHaveLength(0);

    const second = new FakeConnection('c2');

    server.onConnect(asParty(second));
    joinPlayer(server, second, 'token-2');

    const frozen = room.broadcasts.length;

    vi.advanceTimersByTime(TICK_MS * 3);

    // ensureLoop restarted the interval — new broadcasts (ticks/spawns/snapshots) keep arriving.
    expect(room.broadcasts.length).toBeGreaterThan(frozen);
  });

  it('rejects connections beyond maxConnections even when they never join, and frees a slot on close', () => {
    const { server } = setup();
    const conns: FakeConnection[] = [];

    // Idle connections (never join) — bounded by maxConnections, not maxPlayers.
    for (let i = 0; i < GAME.maxConnections; i += 1) {
      const conn = new FakeConnection(`idle-${i}`);

      server.onConnect(asParty(conn));
      conns.push(conn);
    }

    const overflow = new FakeConnection('overflow-conn');

    server.onConnect(asParty(overflow));

    expect(overflow.closed).toBe(true);
    expect(overflow.sent.some((message) => message.type === 'roomFull')).toBe(true);

    // Closing an accepted connection frees a slot for a fresh one.
    server.onClose(asParty(conns[0]));
    const replacement = new FakeConnection('replacement');

    server.onConnect(asParty(replacement));

    expect(replacement.closed).toBe(false);
    expect(replacement.sent.some((message) => message.type === 'snapshot')).toBe(true);
  });

  it('spawns more often with more active players (per-capita scaling)', () => {
    // Fixed RNG → deterministic base spawn delay, so only the active-player scaling differs between rooms.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const single = setup();
    const solo = new FakeConnection('solo');

    single.server.onConnect(asParty(solo));
    joinPlayer(single.server, solo, 'solo-token');

    const many = setup();

    for (let i = 0; i < 4; i += 1) {
      const conn = new FakeConnection(`m${i}`);

      many.server.onConnect(asParty(conn));
      joinPlayer(many.server, conn, `m-token-${i}`);
    }

    vi.advanceTimersByTime(6000);

    expect(byType(many.room, 'spawned').length).toBeGreaterThan(
      byType(single.room, 'spawned').length,
    );
  });
});
