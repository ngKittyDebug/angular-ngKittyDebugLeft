import type { LoopSpec } from '../../engine/definition';

/** Server game-loop cadence, room/connection caps, disconnect grace and click rate-limiting. */
export const LOOP = {
  /** Server game-loop frequency, ticks/sec. Moves items and schedules decay/snapshots. */
  tickRateHz: 10,
  /** Every Nth tick the server broadcasts a (slim) snapshot to heal drift; between snapshots clients rely on delta events and velocity extrapolation. At 10 Hz, 3 = ~3.3 snapshots/sec. The sparser 5 was tried (2/sec) but failed its own throttled-playtest gate: on mobile / 4x CPU throttling remote motion read as wave-like freeze-then-jump (frames starve → extrapolation drifts → each 500ms re-anchor lands a visible correction), so the cadence is back at 3. Re-sparsening requires that gate to pass. */
  snapshotEveryNTicks: 3,
  /** Server liveness heartbeat, ms: a tiny `ping` broadcast on this cadence while any connection is open, independent of the game loop. Gives the client a steady inbound signal even in the lobby/idle (where no snapshots flow) so it can detect a stalled (half-open) socket and reconnect. */
  heartbeatMs: 2_000,
  /** Grace period after disconnect, ms: the player stays in the room (greyed out, decay continues) and may rejoin on reconnection; purged afterward. */
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
} as const satisfies LoopSpec;
