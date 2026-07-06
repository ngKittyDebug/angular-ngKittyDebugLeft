import type * as Party from 'partykit/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { ClientMessage, ServerMessage, ServerState } from '@game/frenzy/types';

import FeedingRoom from '../index';
import { NAME_MAX_LENGTH } from '../validate-join';
import { TEST_BODY } from '../../../engine/__tests__/test-body';

const TICK_MS = 1000 / FRENZY.tickRateHz;

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

// The public player id the server acked to this connection — the only place a test (like a real client) can
// learn which snapshot player belongs to a session, since the token↔id link never rides the wire (issue #124).
function publicIdOf(conn: FakeConnection): string {
  const joined = conn.sent
    .filter(
      (message): message is Extract<ServerMessage, { type: 'joined' }> => message.type === 'joined',
    )
    .at(-1);

  if (joined === undefined) {
    throw new Error(`no joined ack on connection ${conn.id}`);
  }

  return joined.playerId;
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

// Human players in the latest snapshot — isolates the human roster from the angry-bomb NPC, which the server
// spawns into the same `players[]` once a human is present.
function humanPlayers(room: FakeRoom): ServerState['players'] {
  return latestSnapshot(room)?.state.players.filter((player) => player.kind === 'human') ?? [];
}

// Game broadcasts only — excludes the connection-scoped liveness `ping`, which keeps firing while a connection is
// open even after the game loop stops, so the "loop stopped" assertions stay about game traffic.
function gameBroadcasts(room: FakeRoom): ServerMessage[] {
  return room.broadcasts.filter((message) => message.type !== 'ping');
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

    for (let i = 0; i < FRENZY.maxPlayers; i += 1) {
      const conn = new FakeConnection(`c${i}`);

      server.onConnect(asParty(conn));
      joinPlayer(server, conn, `t${i}`);
    }

    const overflow = new FakeConnection('overflow');

    server.onConnect(asParty(overflow));

    expect(overflow.closed).toBe(true);
    expect(overflow.sent.some((message) => message.type === 'roomFull')).toBe(true);
    expect(latestSnapshot(room)?.state.players).toHaveLength(FRENZY.maxPlayers);
  });

  it('truncates an over-long player name to NAME_MAX_LENGTH on join', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    send(server, conn, { type: 'identify', sessionToken: 'long-name-token' });
    send(server, conn, {
      type: 'join',
      name: 'x'.repeat(NAME_MAX_LENGTH + 16),
      appearance: 'caterpie',
      body: TEST_BODY,
    });

    expect(humanPlayers(room)[0].name).toHaveLength(NAME_MAX_LENGTH);
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
    expect(eaten[0].playerId).toBe(publicIdOf(conn));
    expect(eaten[0].itemId).toBe(spawned[0].item.id);
  });

  it('rejects identify for a session already bound to a live connection (issue #124)', () => {
    const { room, server } = setup();
    const tabA = new FakeConnection('tab-a');
    const tabB = new FakeConnection('tab-b');

    server.onConnect(asParty(tabA));
    joinPlayer(server, tabA, 'shared-token');
    // A duplicated tab (or an attacker replaying a sniffed token) identifies while tab A's connection is live.
    server.onConnect(asParty(tabB));
    send(server, tabB, { type: 'identify', sessionToken: 'shared-token' });

    expect(tabB.sent.some((message) => message.type === 'identifyRejected')).toBe(true);

    // The rejected connection holds no session — its input must not drive tab A's Pokémon.
    send(server, tabB, { type: 'steer', x: 0.9, y: 0.1 });

    expect(byType(room, 'steered')).toHaveLength(0);
  });

  it('never echoes the session token in any outbound frame (issue #124)', () => {
    const token = 'super-secret-session-token';
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, token);
    // Run the message surface: scheduled slim + spawned via ticks, steered, then disconnect (rejoined-style
    // grace snapshot) — every broadcast and every connection-scoped frame must stay token-free.
    vi.advanceTimersByTime(TICK_MS * FRENZY.snapshotEveryNTicks);
    send(server, conn, { type: 'steer', x: 0.9, y: 0.1 });
    server.onClose(asParty(conn));

    const frames = [...room.broadcasts, ...conn.sent].map((message) => JSON.stringify(message));

    expect(frames.length).toBeGreaterThan(0);
    expect(frames.some((frame) => frame.includes(token))).toBe(false);
  });

  it('acks join with a server-generated public id distinct from the session token', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    const id = publicIdOf(conn);

    expect(id).not.toBe('token-1');
    expect(latestSnapshot(room)?.state.players.some((player) => player.id === id)).toBe(true);
  });

  it('broadcasts a steered delta event instead of a full snapshot when a player steers', () => {
    // Pin the spawn position so the tap point below is guaranteed to differ from it (a zero direction is a no-op).
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    const snapshotsBefore = byType(room, 'snapshot').length;

    send(server, conn, { type: 'steer', x: 0.9, y: 0.1 });

    const steered = byType(room, 'steered');

    expect(steered).toHaveLength(1);
    expect(steered[0].playerId).toBe(publicIdOf(conn));
    expect(Math.hypot(steered[0].vx, steered[0].vy)).toBeGreaterThan(0);
    // The whole point: player input no longer multiplies full-snapshot traffic.
    expect(byType(room, 'snapshot')).toHaveLength(snapshotsBefore);
  });

  it('ignores a non-string (binary) message without touching game state', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    const before = room.broadcasts.length;

    // A binary frame is never a valid client message — the adapter drops it before parsing, no broadcast, no throw.
    expect(() => server.onMessage(new ArrayBuffer(8), asParty(conn))).not.toThrow();
    expect(room.broadcasts).toHaveLength(before);
  });

  it('drops player input once the per-session click budget is spent within the window', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    // Frozen fake time → every steer shares one rate-limit window. Alternating the target keeps each accepted
    // steer changing velocity (so it broadcasts), proving the cap is hit on count, not on a saturated no-op.
    for (let i = 0; i < FRENZY.clickRateLimitMax; i += 1) {
      send(server, conn, { type: 'steer', x: i % 2 === 0 ? 0.9 : 0.1, y: 0.5 });
    }

    const accepted = byType(room, 'steered').length;

    send(server, conn, { type: 'steer', x: 0.1, y: 0.9 });

    expect(accepted).toBe(FRENZY.clickRateLimitMax);
    expect(byType(room, 'steered')).toHaveLength(FRENZY.clickRateLimitMax);
  });

  it('broadcasts slim snapshots on the scheduled cadence and full ones on roster changes', () => {
    // random→0.5 keeps the NPC spawn window (10s) far beyond the few ticks below, so no roster-change
    // full snapshot can sneak into the cadence window being asserted.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1'); // roster change → full snapshot

    const fullBefore = byType(room, 'snapshot').length;

    expect(fullBefore).toBeGreaterThan(0);

    vi.advanceTimersByTime(TICK_MS * FRENZY.snapshotEveryNTicks);

    const slim = byType(room, 'slimSnapshot');

    expect(slim).toHaveLength(1);

    // Dynamic-only payload: the static half never rides the slim wire.
    const wirePlayer = slim[0].state.players.find((player) => player.id === publicIdOf(conn));

    expect(wirePlayer).toBeDefined();
    expect(wirePlayer?.hp).toBeGreaterThan(0);
    expect(Object.keys(wirePlayer!)).not.toContain('name');
    expect(Object.keys(wirePlayer!)).not.toContain('body');
    expect(Object.keys(wirePlayer!)).not.toContain('appearance');

    // The scheduled cadence no longer multiplies full snapshots.
    expect(byType(room, 'snapshot')).toHaveLength(fullBefore);
  });

  it('marks a player disconnected on close and purges them after the grace period', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    server.onClose(asParty(conn));

    const afterClose = latestSnapshot(room);

    expect(afterClose?.state.players[0].status).toBe('disconnected');

    vi.advanceTimersByTime(FRENZY.graceMs + TICK_MS);

    // Grace runs longer than the NPC spawn window, so the autobot is in the snapshot by now — assert on humans only.
    expect(humanPlayers(room)).toHaveLength(0);
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

    const restoredId = publicIdOf(first);

    expect(byType(room, 'rejoined').some((message) => message.playerId === restoredId)).toBe(true);
    // The reconnecting socket gets its own `joined` ack carrying the SAME public id — how the client re-learns
    // which player is "me" after a refresh.
    expect(publicIdOf(second)).toBe(restoredId);
    expect(latestSnapshot(room)?.state.players[0].status).toBe('alive');

    // Grace timer was cancelled — advancing past it must not purge the restored player.
    vi.advanceTimersByTime(FRENZY.graceMs + TICK_MS);

    // The NPC also spawns during the wait; assert on humans only to isolate the restored player.
    expect(humanPlayers(room)).toHaveLength(1);
  });

  it('stops the game loop once the last player leaves', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    vi.advanceTimersByTime(TICK_MS * 3);
    expect(room.broadcasts.length).toBeGreaterThan(0);

    send(server, conn, { type: 'leave' });
    const frozen = gameBroadcasts(room).length;

    vi.advanceTimersByTime(TICK_MS * 10);

    expect(gameBroadcasts(room).length).toBe(frozen);
  });

  it('stops the game loop when the last player dies from decay', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    // Force every spawn to rock (a non-feeding type — collisions only damage) so falling items can't
    // passively feed the idle player — decay must drain startingHp to 0 and faint the last player.
    vi.spyOn(Math, 'random').mockReturnValue(0.4);

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    const toDeathMs =
      FRENZY.decayIntervalMs * (FRENZY.startingHp / FRENZY.decayPerTick) + FRENZY.decayIntervalMs;

    vi.advanceTimersByTime(toDeathMs);

    expect(byType(room, 'fainted').some((message) => message.playerId === publicIdOf(conn))).toBe(
      true,
    );
    expect(latestSnapshot(room)?.state.players).toHaveLength(0);

    const frozen = gameBroadcasts(room).length;

    vi.advanceTimersByTime(TICK_MS * 10);

    expect(gameBroadcasts(room).length).toBe(frozen);
  });

  it('restarts the loop when a player joins after the room emptied via death', () => {
    const { room, server } = setup();
    const first = new FakeConnection('c1');

    // Rock-only spawns can't passively feed the idle player (see decay-death test above).
    vi.spyOn(Math, 'random').mockReturnValue(0.4);

    server.onConnect(asParty(first));
    joinPlayer(server, first, 'token-1');

    const toDeathMs =
      FRENZY.decayIntervalMs * (FRENZY.startingHp / FRENZY.decayPerTick) + FRENZY.decayIntervalMs;

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

  it('heartbeats a liveness ping on cadence for an idle (never-joined) connection and stops once empty', () => {
    const { room, server } = setup();
    const conn = new FakeConnection('idle');

    // Pure lobby connection: it never joins, so the game loop never starts and no snapshots flow. The heartbeat
    // is the only inbound signal — it must still fire so the client can tell this live socket from a stalled one.
    server.onConnect(asParty(conn));

    vi.advanceTimersByTime(FRENZY.heartbeatMs * 2 + 1);

    expect(byType(room, 'ping').length).toBeGreaterThanOrEqual(2);

    // Once the last connection closes, the heartbeat stops (no dangling interval pinging an empty room).
    server.onClose(asParty(conn));
    const frozen = byType(room, 'ping').length;

    vi.advanceTimersByTime(FRENZY.heartbeatMs * 3);

    expect(byType(room, 'ping').length).toBe(frozen);
  });

  it('rejects connections beyond maxConnections even when they never join, and frees a slot on close', () => {
    const { server } = setup();
    const conns: FakeConnection[] = [];

    // Idle connections (never join) — bounded by maxConnections, not maxPlayers.
    for (let i = 0; i < FRENZY.maxConnections; i += 1) {
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

function npcCount(room: FakeRoom): number {
  const snapshot = latestSnapshot(room);

  if (snapshot === undefined) {
    return 0;
  }

  return snapshot.state.players.filter((player) => player.kind === 'npc').length;
}

describe('FeedingRoom — angry-bomb NPC lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('spawns the NPC within the initial 0–20s window after the first human joins (not the 40s respawn)', () => {
    // random→0 pins both the spawn-window delay (0ms) and the NPC's x; the NPC appears on the first tick.
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    expect(npcCount(room)).toBe(0);

    // Advance less than the 40s respawn delay — the NPC must already be here from the initial window.
    vi.advanceTimersByTime(FRENZY.npc.spawnDelayMsRange[1]);

    expect(npcCount(room)).toBe(1);
    expect(FRENZY.npc.spawnDelayMsRange[1]).toBeLessThan(FRENZY.npc.respawnDelayMs);
  });

  it('keeps at most one NPC alive at a time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    vi.advanceTimersByTime(FRENZY.npc.respawnDelayMs * 2);

    expect(npcCount(room)).toBe(1);
  });

  it('does not spawn the NPC before any human joins', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { room, server } = setup();
    const conn = new FakeConnection('idle');

    // Pure lobby connection: no join → no humans → no NPC, even after a long wait.
    server.onConnect(asParty(conn));

    vi.advanceTimersByTime(FRENZY.npc.respawnDelayMs);

    expect(npcCount(room)).toBe(0);
  });

  it('accrues NPC anger on rapid pokes from a player (mana climbs)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    vi.advanceTimersByTime(FRENZY.npc.spawnDelayMsRange[1]);

    const npc = latestSnapshot(room)?.state.players.find((player) => player.kind === 'npc');

    expect(npc).toBeDefined();

    const snapshotsBefore = byType(room, 'snapshot').length;

    // A burst of pokes in the anger window — superlinear gain pushes mana above 0.
    for (let i = 0; i < 3; i += 1) {
      send(server, conn, { type: 'pokeNpc', npcId: npc!.id });
    }

    // Each poke rides a tiny npcAngered delta event — no full-snapshot broadcast per poke.
    const angered = byType(room, 'npcAngered');

    expect(angered.length).toBeGreaterThan(0);
    expect(angered.at(-1)?.mana).toBeGreaterThan(0);
    expect(byType(room, 'snapshot')).toHaveLength(snapshotsBefore);

    // The scheduled (slim) snapshot reconciles the same mana.
    vi.advanceTimersByTime(TICK_MS * FRENZY.snapshotEveryNTicks);

    const pokedNpc = byType(room, 'slimSnapshot')
      .at(-1)
      ?.state.players.find((player) => player.id === npc!.id);

    expect(pokedNpc?.mana).toBeGreaterThan(0);
  });

  it('removes the NPC and stops the loop when the last human leaves', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { room, server } = setup();
    const conn = new FakeConnection('c1');

    server.onConnect(asParty(conn));
    joinPlayer(server, conn, 'token-1');

    vi.advanceTimersByTime(FRENZY.npc.spawnDelayMsRange[1]);
    expect(npcCount(room)).toBe(1);

    send(server, conn, { type: 'leave' });

    const frozen = gameBroadcasts(room).length;

    vi.advanceTimersByTime(TICK_MS * 10);

    // Loop stopped (stopLoop dropped the NPC + cleared its schedule) — no further game broadcasts, no NPC re-arm.
    expect(gameBroadcasts(room).length).toBe(frozen);

    // Re-joining starts a fresh, person-ful room: the NPC's stored state was cleared, so a new spawn window arms
    // and a single NPC re-appears (proving the old NPC and its schedule were purged, not left dangling).
    const second = new FakeConnection('c2');

    server.onConnect(asParty(second));
    joinPlayer(server, second, 'token-2');

    vi.advanceTimersByTime(FRENZY.npc.spawnDelayMsRange[1]);

    expect(npcCount(room)).toBe(1);
  });
});
