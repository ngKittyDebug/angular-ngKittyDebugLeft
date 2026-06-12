import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import PartySocket from 'partysocket';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';

import { FRENZY } from '@game/frenzy/config';
import type { ClientMessage, ServerMessage } from '@game/frenzy/types';

import { environment } from '@environments/environment';
import { shouldForceReconnect } from './socket-liveness';

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

// Inbound-liveness watchdog cadence: check once per server heartbeat whether an `open` socket has gone silent
// (stall policy lives in `shouldForceReconnect`), and if so force a reconnect to pull a fresh snapshot.
const WATCHDOG_INTERVAL_MS = FRENZY.heartbeatMs;

@Injectable()
export class FrenzySocketService {
  private readonly destroyRef = inject(DestroyRef);
  private socket: PartySocket | null = null;
  private readonly _status = signal<SocketStatus>('idle');
  // True while a stalled socket is being reconnected — distinct from `closed` so the UI can show "reconnecting"
  // instead of a teardown, and the game keeps rendering through the blip.
  private readonly _stale = signal(false);
  private lastMessageAt = 0;
  private watchdogHandle: ReturnType<typeof setInterval> | null = null;
  private readonly messagesSubject = new Subject<ServerMessage>();

  public readonly messages$: Observable<ServerMessage> = this.messagesSubject.asObservable();
  public readonly status = this._status.asReadonly();
  public readonly stale = this._stale.asReadonly();

  public constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  public connect(roomId = 'feeding-frenzy'): void {
    if (this.socket !== null) {
      return;
    }

    this._status.set('connecting');
    this.lastMessageAt = Date.now();

    const socket = new PartySocket({ host: environment.partyHost, room: roomId, party: 'frenzy' });

    socket.addEventListener('open', () => {
      this._status.set('open');
      this._stale.set(false);
      this.lastMessageAt = Date.now();
    });
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      this.lastMessageAt = Date.now();
      this.messagesSubject.next(JSON.parse(event.data) as ServerMessage);
    });
    socket.addEventListener('close', () => this._status.set('closed'));
    socket.addEventListener('error', (event) => {
      this._status.set('error');
      console.warn('[frenzy] socket error', event);
    });

    this.socket = socket;
    this.watchdogHandle = setInterval(() => this.checkLiveness(), WATCHDOG_INTERVAL_MS);
  }

  public disconnect(): void {
    if (this.watchdogHandle !== null) {
      clearInterval(this.watchdogHandle);
      this.watchdogHandle = null;
    }

    this._stale.set(false);
    this.socket?.close();
    this.socket = null;
  }

  public send(message: ClientMessage): void {
    this.socket?.send(JSON.stringify(message));
  }

  // Force a reconnect when an `open` socket has gone silent past the stale threshold; `reconnect()` closes and
  // re-opens, and the server's `onConnect` replies with a fresh snapshot (re-syncing players that arrived during
  // the stall). Skipped while already reconnecting or when not in a live-believed `open` state.
  private checkLiveness(): void {
    if (this.socket === null) {
      return;
    }

    if (
      !shouldForceReconnect(
        this._status() === 'open',
        this._stale(),
        Date.now() - this.lastMessageAt,
      )
    ) {
      return;
    }

    this._stale.set(true);
    this.socket.reconnect();
  }
}
