import { checkClickRate } from './check-click-rate';

/**
 * Per-session state for one feeding-room participant, keyed in `FeedingRoom` by its private session token.
 *
 * Collapses the four token-keyed Maps the adapter used to juggle in parallel — the connection↔token binding, the
 * session→player-id mapping, the per-session click history and the grace-purge timer — into one object whose
 * lifecycle moves together. A session is born when a connection first identifies with a token, gains a `playerId`
 * on join, may straddle a grace window across a reconnect, and dies when its last connection closes with no active
 * player (or its grace purge fires). Holding it as one unit makes the click-rate budget and grace timer testable in
 * isolation, away from the game loop.
 */
export class RoomSession {
  // Connection ids currently bound to this session token (multiple = duplicated tabs sharing one click budget).
  private readonly connectionIds = new Set<string>();
  // Click history (server-clock ms), shared across this session's tabs so extra tabs can't multiply the budget.
  private clickTimestamps: number[] = [];
  // The session's public player id once it has joined; null while identified-but-not-yet-joined or after leave/purge.
  private playerIdValue: string | null = null;
  // Pending grace-purge timer armed on disconnect; null when no purge is scheduled.
  private graceTimerHandle: ReturnType<typeof setTimeout> | null = null;

  public constructor(public readonly token: string) {}

  public get playerId(): string | null {
    return this.playerIdValue;
  }

  public set playerId(value: string | null) {
    this.playerIdValue = value;
  }

  public bindConnection(connectionId: string): void {
    this.connectionIds.add(connectionId);
  }

  public unbindConnection(connectionId: string): void {
    this.connectionIds.delete(connectionId);
  }

  public hasConnection(connectionId: string): boolean {
    return this.connectionIds.has(connectionId);
  }

  public hasConnections(): boolean {
    return this.connectionIds.size > 0;
  }

  // True when a connection OTHER than `connectionId` is bound — the first-bind-guard against a hijacked token.
  public hasOtherConnection(connectionId: string): boolean {
    for (const id of this.connectionIds) {
      if (id !== connectionId) {
        return true;
      }
    }

    return false;
  }

  // Records a click/steer/poke at `now` against this session's shared budget and reports whether it is allowed.
  public recordClick(now: number): boolean {
    const rate = checkClickRate(this.clickTimestamps, now);

    this.clickTimestamps = rate.timestamps;

    return rate.allowed;
  }

  // Resets the click budget when the session's last connection closes — no surviving tab can share its history.
  public clearClicks(): void {
    this.clickTimestamps = [];
  }

  // Arms (or re-arms) the grace-purge timer, cancelling any pending one first so a reconnect→disconnect can't stack.
  // The handle self-clears when the timer fires, mirroring the adapter's old `graceTimers.delete` on the fired token.
  public startGrace(callback: () => void, delayMs: number): void {
    this.clearGrace();
    this.graceTimerHandle = setTimeout(() => {
      this.graceTimerHandle = null;
      callback();
    }, delayMs);
  }

  public clearGrace(): void {
    if (this.graceTimerHandle !== null) {
      clearTimeout(this.graceTimerHandle);
      this.graceTimerHandle = null;
    }
  }
}
