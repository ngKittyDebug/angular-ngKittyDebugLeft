import type * as Party from 'partykit/server';

import { FRENZY } from '@game/frenzy/config';
import type { Item, Player, PlayerBody, ServerMessage, ServerState } from '@game/frenzy/types';

import { applyClick } from './engine/apply-click';
import { applyEmissions } from './engine/apply-emissions';
import { projectTimeAlive } from './engine/apply-scores';
import { applySteer } from './engine/apply-steer';
import { applyTick } from './engine/apply-tick';
import { checkClickRate } from './engine/check-click-rate';
import { createPlayer } from './engine/create-player';
import { markDisconnected } from './engine/mark-disconnected';
import { pickItemType } from './engine/pick-item-type';
import { restoreConnected } from './engine/restore-connected';
import { parseClientMessage } from './parse-client-message';
import { validateJoin } from './validate-join';

const HEARTBEAT_INTERVAL_MS = FRENZY.heartbeatMs;
const TICK_INTERVAL_MS = 1000 / FRENZY.tickRateHz;
const TICK_DELTA_SECONDS = 1 / FRENZY.tickRateHz;
const DECAY_EVERY_N_TICKS = (FRENZY.decayIntervalMs / 1000) * FRENZY.tickRateHz;

export default class FeedingRoom implements Party.Server {
  // Click history keyed by sessionToken (per player), so opening extra tabs can't multiply the click budget.
  private readonly clickTimestamps = new Map<string, number[]>();
  private readonly connectionToSession = new Map<string, string>();
  private readonly graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Accepted connection ids — bounds total connections (incl. idle/not-yet-joined) beyond the player cap.
  private readonly connections = new Set<string>();
  private items: Item[] = [];
  private players: Player[] = [];
  private loopHandle: ReturnType<typeof setInterval> | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private nextSpawnAt = 0;
  // Per-player aura emission schedule (`playerId -> nextEmitAt`, server-clock ms). Rebuilt each tick from live aura
  // holders by `applyEmissions`, so it self-prunes when a holder dies, leaves or the aura expires.
  private nextEmitAtByPlayer = new Map<string, number>();
  private tick = 0;
  private readonly debugEnabled: boolean;

  public constructor(public readonly room: Party.Room) {
    const flag = this.room.env?.DEBUG;

    this.debugEnabled = flag === true || flag === 'true' || flag === '1';
  }

  public onConnect(conn: Party.Connection): void {
    if (
      this.players.length >= FRENZY.maxPlayers ||
      this.connections.size >= FRENZY.maxConnections
    ) {
      this.sendTo(conn, { type: 'roomFull' });
      conn.close();

      return;
    }

    this.connections.add(conn.id);
    this.ensureHeartbeat();
    this.log(`[party] connected: ${conn.id} (room=${this.room.id})`);
    this.sendTo(conn, this.snapshot());
  }

  public onMessage(raw: string | ArrayBuffer, sender: Party.Connection): void {
    if (typeof raw !== 'string') {
      return;
    }

    const message = parseClientMessage(raw);

    if (message === null) {
      return;
    }

    switch (message.type) {
      case 'identify': {
        this.handleIdentify(sender.id, message.sessionToken);
        break;
      }
      case 'join': {
        this.handleJoin(sender, message.name, message.appearance, message.body);
        break;
      }
      case 'leave': {
        this.handleLeave(sender.id);
        break;
      }
      case 'click': {
        this.handleClick(sender.id, message.itemId, message.nudgeX, message.nudgeY);
        break;
      }
      case 'steer': {
        this.handleSteer(sender.id, message.x, message.y);
        break;
      }
    }
  }

  public onClose(conn: Party.Connection): void {
    this.connections.delete(conn.id);

    // Liveness heartbeat outlives the game loop (it covers idle/lobby connections too) — stop it only once the
    // room has no connections left at all, regardless of which onClose branch we return through below.
    if (this.connections.size === 0) {
      this.stopHeartbeat();
    }

    const sessionToken = this.connectionToSession.get(conn.id);

    this.connectionToSession.delete(conn.id);

    if (sessionToken === undefined) {
      this.log(`[party] disconnected: ${conn.id} (unidentified)`);

      return;
    }

    const stillUsedByOtherConnection = [...this.connectionToSession.values()].includes(
      sessionToken,
    );

    if (stillUsedByOtherConnection) {
      this.log(`[party] disconnected: ${conn.id} (session=${sessionToken}, other tabs open)`);

      return;
    }

    // Last connection for this session is gone — no other tab can share its click history.
    this.clickTimestamps.delete(sessionToken);

    if (!this.players.some((player) => player.id === sessionToken)) {
      this.log(`[party] disconnected: ${conn.id} (session=${sessionToken}, no active player)`);

      return;
    }

    const next = markDisconnected(this.currentState(), sessionToken, Date.now());

    this.syncState(next);
    this.broadcast(this.snapshot());
    this.scheduleGracePurge(sessionToken);

    this.log(`[party] disconnected: ${conn.id} (session=${sessionToken}, grace started)`);
  }

  private broadcast(message: ServerMessage): void {
    this.room.broadcast(JSON.stringify(message));
  }

  private currentState(): ServerState {
    return {
      players: this.players,
      items: this.items,
      tick: this.tick,
    };
  }

  private ensureLoop(): void {
    if (this.loopHandle === null) {
      this.startLoop();
    }
  }

  // Liveness heartbeat: a steady inbound signal for clients so they can tell a live-but-idle socket from a stalled
  // (half-open) one and reconnect. Runs while any connection is open — independent of the game loop, which only
  // runs with active players and so leaves lobby/spectator connections without traffic.
  private ensureHeartbeat(): void {
    if (this.heartbeatHandle === null) {
      this.heartbeatHandle = setInterval(
        () => this.broadcast({ type: 'ping' }),
        HEARTBEAT_INTERVAL_MS,
      );
    }
  }

  private gameTick(): void {
    this.tick += 1;

    const shouldDecay = this.tick % DECAY_EVERY_N_TICKS === 0;
    const result = applyTick(this.currentState(), TICK_DELTA_SECONDS, shouldDecay);

    this.syncState(result.state);

    for (const event of result.events) {
      this.broadcast(event);
    }

    // Last player can leave via death (decay/fatal land), not only via leave/grace-purge — stop the loop here too.
    if (this.players.length === 0) {
      this.broadcast(this.snapshot());
      this.stopLoop();

      return;
    }

    const now = Date.now();

    // Aura emissions: players under the `laying`/`pooping` aura drip one item per `emitIntervalMs` (schedule kept server-side).
    const emission = applyEmissions(this.currentState(), now, this.nextEmitAtByPlayer);

    this.nextEmitAtByPlayer = emission.schedule;

    if (emission.spawned.length > 0) {
      this.syncState(emission.state);

      for (const item of emission.spawned) {
        this.broadcast({ type: 'spawned', item });
      }
    }

    if (now >= this.nextSpawnAt) {
      this.spawnItem();
      this.nextSpawnAt = now + this.nextSpawnDelayMs();
    }

    if (this.tick % FRENZY.snapshotEveryNTicks === 0) {
      this.broadcast(this.snapshot());
    }
  }

  private handleClick(
    connectionId: string,
    itemId: string,
    nudgeX?: number,
    nudgeY?: number,
  ): void {
    const sessionToken = this.connectionToSession.get(connectionId);

    if (sessionToken === undefined) {
      return;
    }

    const rate = checkClickRate(this.clickTimestamps.get(sessionToken) ?? [], Date.now());

    this.clickTimestamps.set(sessionToken, rate.timestamps);

    if (!rate.allowed) {
      return;
    }

    const result = applyClick(this.currentState(), sessionToken, itemId, nudgeX, nudgeY);

    if (result.events.length === 0) {
      return;
    }

    this.syncState(result.state);

    for (const event of result.events) {
      this.broadcast(event);
    }

    // A fatal click can empty the room — stop the loop so it doesn't run against an empty room.
    if (this.players.length === 0) {
      this.stopLoop();
    }
  }

  private handleSteer(connectionId: string, x: number, y: number): void {
    const sessionToken = this.connectionToSession.get(connectionId);

    if (sessionToken === undefined) {
      return;
    }

    // Steering shares the click rate-limit budget — it's player input and each accepted steer broadcasts a snapshot.
    const rate = checkClickRate(this.clickTimestamps.get(sessionToken) ?? [], Date.now());

    this.clickTimestamps.set(sessionToken, rate.timestamps);

    if (!rate.allowed) {
      return;
    }

    const state = this.currentState();
    const next = applySteer(state, sessionToken, x, y);

    // applySteer returns the same state reference when nothing changed (unknown/dead player, zero direction).
    if (next === state) {
      return;
    }

    this.syncState(next);
    this.broadcast(this.snapshot());
  }

  private handleIdentify(connectionId: string, sessionToken: string): void {
    this.connectionToSession.set(connectionId, sessionToken);

    const existing = this.players.find((player) => player.id === sessionToken);

    if (existing === undefined || existing.status !== 'disconnected') {
      return;
    }

    const timer = this.graceTimers.get(sessionToken);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.graceTimers.delete(sessionToken);
    }

    this.syncState(restoreConnected(this.currentState(), sessionToken));
    this.broadcast({ type: 'rejoined', playerId: sessionToken });
    this.broadcast(this.snapshot());
    this.log(`[party] rejoined: ${connectionId} (session=${sessionToken})`);
  }

  private handleJoin(
    conn: Party.Connection,
    name: string,
    appearance: string,
    body: PlayerBody,
  ): void {
    const sessionToken = this.connectionToSession.get(conn.id);

    if (sessionToken === undefined) {
      return;
    }

    if (this.players.some((player) => player.id === sessionToken)) {
      return;
    }

    const reason = validateJoin(name, appearance, body);

    if (reason !== null) {
      this.sendTo(conn, { type: 'joinRejected', reason });

      return;
    }

    const player = createPlayer({
      sessionToken,
      name: name.trim().slice(0, 24),
      appearance,
      body,
      now: Date.now(),
      existingPlayers: this.players,
    });

    this.players = [...this.players, player];
    this.broadcast(this.snapshot());
    this.ensureLoop();
  }

  private handleLeave(connectionId: string): void {
    const sessionToken = this.connectionToSession.get(connectionId);

    if (sessionToken === undefined) {
      return;
    }

    const before = this.players.length;

    this.players = this.players.filter((player) => player.id !== sessionToken);

    if (this.players.length !== before) {
      this.broadcast(this.snapshot());
    }

    if (this.players.length === 0) {
      this.stopLoop();
    }
  }

  private sendTo(conn: Party.Connection, message: ServerMessage): void {
    conn.send(JSON.stringify(message));
  }

  private snapshot(): ServerMessage {
    // Stamp `timeAlive` into the projection only (see `projectTimeAlive`) — kept out of `currentState` so it never
    // leaks into the engine's stored scores; the formula lives with the other score logic and is unit-tested there.
    const state = this.currentState();
    const players = projectTimeAlive(state.players, Date.now());

    return { type: 'snapshot', state: { ...state, players } };
  }

  private spawnItem(): void {
    const [minX, maxX] = FRENZY.itemSpawnXRange;
    const type = pickItemType(Math.random);
    const item: Item = {
      id: crypto.randomUUID(),
      type,
      x: minX + Math.random() * (maxX - minX),
      y: 0,
      vy: FRENZY.fallSpeed[type],
    };

    this.items = [...this.items, item];
    this.broadcast({ type: 'spawned', item });
  }

  // Spawn rate scales with active players so per-capita food income stays ~constant (calibrated at spawnReferencePlayers).
  private nextSpawnDelayMs(): number {
    const [minMs, maxMs] = FRENZY.spawnIntervalMsRange;
    const baseDelay = minMs + Math.random() * (maxMs - minMs);
    const activeCount = Math.max(
      1,
      this.players.filter((player) => player.status === 'alive').length,
    );

    return (baseDelay * FRENZY.spawnReferencePlayers) / activeCount;
  }

  private startLoop(): void {
    this.tick = 0;
    this.nextSpawnAt = Date.now();
    this.loopHandle = setInterval(() => this.gameTick(), TICK_INTERVAL_MS);
  }

  private scheduleGracePurge(sessionToken: string): void {
    const existing = this.graceTimers.get(sessionToken);

    if (existing !== undefined) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.graceTimers.delete(sessionToken);

      const player = this.players.find((candidate) => candidate.id === sessionToken);

      if (player === undefined || player.status !== 'disconnected') {
        return;
      }

      this.players = this.players.filter((candidate) => candidate.id !== sessionToken);
      this.log(`[party] grace expired, purged session=${sessionToken}`);
      this.broadcast(this.snapshot());

      if (this.players.length === 0) {
        this.stopLoop();
      }
    }, FRENZY.graceMs);

    this.graceTimers.set(sessionToken, timer);
  }

  private stopLoop(): void {
    if (this.loopHandle !== null) {
      clearInterval(this.loopHandle);
      this.loopHandle = null;
    }

    for (const timer of this.graceTimers.values()) {
      clearTimeout(timer);
    }

    this.graceTimers.clear();
    this.items = [];
    this.tick = 0;
  }

  private stopHeartbeat(): void {
    if (this.heartbeatHandle !== null) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
  }

  private syncState(state: ServerState): void {
    this.players = state.players;
    this.items = state.items;
  }

  private log(message: string): void {
    if (this.debugEnabled) {
      console.log(message);
    }
  }
}
