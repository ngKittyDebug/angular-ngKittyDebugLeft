import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tap } from 'rxjs';

import type { ServerMessage, ServerState } from '@game/frenzy/types';

import { applyServerMessage } from './apply-server-message';
import { FrenzySocketService } from '../services/frenzy-socket.service';
import { SessionTokenService } from '../services/session-token.service';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'roomFull';

interface FrenzyState {
  state: ServerState | null;
  myId: string | null;
  myFaintedAt: number | null;
  roomFull: boolean;
}

const initialState: FrenzyState = {
  state: null,
  myId: null,
  myFaintedAt: null,
  roomFull: false,
};

export const FrenzyStore = signalStore(
  withState(initialState),
  withComputed((store) => {
    const socket = inject(FrenzySocketService);

    return {
      connectionStatus: computed<ConnectionStatus>(() => {
        if (store.roomFull()) {
          return 'roomFull';
        }

        const status = socket.status();

        if (status === 'open') {
          return 'open';
        }

        if (status === 'closed' || status === 'error') {
          return 'closed';
        }

        return 'connecting';
      }),
      disconnectedCount: computed(
        () =>
          store.state()?.players.filter((player) => player.status === 'disconnected').length ?? 0,
      ),
      leaderboard: computed(() =>
        [...(store.state()?.players ?? [])].sort((a, b) => b.mass - a.mass).slice(0, 5),
      ),
      me: computed(() => {
        const id = store.myId();

        return store.state()?.players.find((player) => player.id === id) ?? null;
      }),
      presenceCount: computed(() => store.state()?.players.length ?? 0),
    };
  }),
  withMethods(
    (store, socket = inject(FrenzySocketService), sessionTokens = inject(SessionTokenService)) => ({
      click(itemId: string, nudgeX?: number): void {
        socket.send({ type: 'click', itemId, nudgeX });
      },
      connect(roomId = 'feeding-frenzy'): void {
        const token = sessionTokens.getOrCreateToken();

        patchState(store, { myId: token });
        socket.connect(roomId);
      },
      disconnect(): void {
        socket.disconnect();
      },
      dismissFainted(): void {
        patchState(store, { myFaintedAt: null });
      },
      join(name: string, appearance: string): void {
        sessionTokens.saveName(name);
        patchState(store, { myFaintedAt: null });
        socket.send({ type: 'join', name, appearance });
      },
      steer(x: number, y: number): void {
        socket.send({ type: 'steer', x, y });
      },
    }),
  ),
  withHooks({
    onInit(store) {
      const socket = inject(FrenzySocketService);
      const consume = rxMethod<ServerMessage>(
        tap((message) => {
          patchState(store, (current) => {
            const next: Partial<FrenzyState> = {
              state: applyServerMessage(current.state, message),
            };

            if (message.type === 'roomFull') {
              next.roomFull = true;
            }

            if (message.type === 'fainted' && message.playerId === current.myId) {
              next.myFaintedAt = Date.now();
            }

            return next;
          });
        }),
      );

      consume(socket.messages$);

      effect(() => {
        const token = store.myId();

        if (token !== null && socket.status() === 'open') {
          socket.send({ type: 'identify', sessionToken: token });
        }
      });
    },
  }),
);
