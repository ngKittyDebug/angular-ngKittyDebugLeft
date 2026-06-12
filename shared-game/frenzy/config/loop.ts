/** Server game-loop cadence, room/connection caps, disconnect grace and click rate-limiting. */
export const LOOP = {
  /** Server game-loop frequency, ticks/sec. Moves items and schedules decay/snapshots. */
  tickRateHz: 10,
  /** Every Nth tick the server broadcasts a full snapshot to heal drift; between snapshots clients rely on delta events and velocity extrapolation. At 10 Hz, 3 ≈ 3.3 snapshots/sec — frequent enough that the client's reconciliation corrections stay small (and remote heading changes surface fast), while delta events still carry the gaps. */
  snapshotEveryNTicks: 3,
  /** Server liveness heartbeat, ms: a tiny `ping` broadcast on this cadence while any connection is open, independent of the game loop. Gives the client a steady inbound signal even in the lobby/idle (where no snapshots flow) so it can detect a stalled (half-open) socket and reconnect. */
  heartbeatMs: 2_000,
  /** Grace period after disconnect, ms: the Pokémon stays in the room (greyed out, decay continues) and may rejoin on reconnection; purged afterward. */
  graceMs: 60_000,
  /** Delay after fainting, ms, during which the "Pick a new one" button is disabled (anti-instant-respawn farming). */
  cooldownAfterFaintedMs: 3_000,
  /** Hard cap of players in a room; beyond it `onConnect` sends `roomFull` and closes the connection. */
  maxPlayers: 20,
  /** Hard cap of simultaneous connections (incl. multi-tab and not-yet-joined spectators); bounds idle/non-joining connects that `maxPlayers` alone does not. */
  maxConnections: 60,
  /** Sliding click rate-limit window, ms. */
  clickRateLimitWindowMs: 1000,
  /** Max clicks allowed within `clickRateLimitWindowMs`; beyond it the click is ignored (anti-spam/autoclicker). */
  clickRateLimitMax: 10,
} as const;
