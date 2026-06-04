import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import PartySocket from 'partysocket';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';

import type { ClientMessage, ServerMessage } from '@game/frenzy/types';

import { environment } from '@environments/environment';

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

@Injectable()
export class FrenzySocketService {
  private readonly destroyRef = inject(DestroyRef);
  private socket: PartySocket | null = null;
  private readonly _status = signal<SocketStatus>('idle');
  private readonly messagesSubject = new Subject<ServerMessage>();

  public readonly messages$: Observable<ServerMessage> = this.messagesSubject.asObservable();
  public readonly status = this._status.asReadonly();

  public constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  public connect(roomId = 'feeding-frenzy'): void {
    if (this.socket !== null) {
      return;
    }

    this._status.set('connecting');

    const socket = new PartySocket({ host: environment.partyHost, room: roomId, party: 'frenzy' });

    socket.addEventListener('open', () => this._status.set('open'));
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      this.messagesSubject.next(JSON.parse(event.data) as ServerMessage);
    });
    socket.addEventListener('close', () => this._status.set('closed'));
    socket.addEventListener('error', (event) => {
      this._status.set('error');
      console.warn('[frenzy] socket error', event);
    });

    this.socket = socket;
  }

  public disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  public send(message: ClientMessage): void {
    this.socket?.send(JSON.stringify(message));
  }
}
