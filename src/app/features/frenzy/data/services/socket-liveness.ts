import { FRENZY } from '@game/frenzy/config';

// The server emits at least a `ping` every `heartbeatMs`, so an `open` socket silent for several times that long
// has a stalled receive side (a half-open socket the browser won't surface as `close`). Three cadences tolerates
// ordinary jitter/GC pauses while still catching a real stall within a few seconds.
export const STALE_AFTER_MS = FRENZY.heartbeatMs * 3;

/**
 * Whether the inbound-liveness watchdog should force a reconnect this check. Pure policy, split out so it can be
 * unit-tested without a socket: trigger only on an `open` socket that is not already reconnecting and has been
 * silent past the stale threshold.
 */
export function shouldForceReconnect(
  isOpen: boolean,
  alreadyStale: boolean,
  silentForMs: number,
): boolean {
  return isOpen && !alreadyStale && silentForMs > STALE_AFTER_MS;
}
