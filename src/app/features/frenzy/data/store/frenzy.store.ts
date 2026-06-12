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

import { crownIdOf } from '@game/frenzy/crown';
import type {
  FaintCause,
  JoinRejectReason,
  PlayerBody,
  ServerMessage,
  ServerState,
} from '@game/frenzy/types';

import { applyServerMessage } from './apply-server-message';
import { FrenzySocketService } from '../services/frenzy-socket.service';
import { PlayerPersistenceService } from '../services/player-persistence.service';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'closed'
  | 'roomFull'
  | 'reconnecting';

interface FrenzyState {
  state: ServerState | null;
  myId: string | null;
  myFaintedAt: number | null;
  // Captured at the moment I faint (for the obituary in the fainted modal): the killing-blow cause and, when an
  // item from another player landed it, that player's name resolved from the snapshot before they drift on.
  myFaintCause: FaintCause | null;
  myKillerName: string | null;
  roomFull: boolean;
  // Set when the server refuses a join (bad name/appearance/body); cleared on the next join attempt. Surfaced in
  // the picker so the player sees why instead of the submit silently doing nothing.
  joinError: JoinRejectReason | null;
}

const initialState: FrenzyState = {
  state: null,
  myId: null,
  myFaintedAt: null,
  myFaintCause: null,
  myKillerName: null,
  roomFull: false,
  joinError: null,
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

        // A stalled-and-reconnecting socket flaps through `closed` while `reconnect()` runs — surface it as a
        // distinct `reconnecting` (checked before the raw status) so the game keeps rendering through the blip.
        if (socket.stale()) {
          return 'reconnecting';
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
      // Ranked alive-first, then by raw hp (the live threat order), NOT by `totalScore` — hp is the crown axis and
      // the bounty target, score is a separate cumulative axis with no UI consumer landed yet (see Player.scores).
      // Alive-first keeps rank #1 == the crown holder (`crownIdOf`): a disconnected ex-leader with higher hp still
      // appears (greyed, below the living) but never outranks the actual alive leader, so the list, the collapsed
      // pill and the scene crown all tell one story.
      leaderboard: computed(() =>
        [...(store.state()?.players ?? [])]
          .sort((a, b) => {
            const aDown = a.status === 'disconnected' ? 1 : 0;
            const bDown = b.status === 'disconnected' ? 1 : 0;

            return aDown - bDown || b.hp - a.hp;
          })
          .slice(0, 5),
      ),
      // The crowned player (alive hp-leader, ties by id) via the shared selector — the single source the scene
      // marker, the leaderboard pill and the minimap all agree on, so the crown can't show on one and not another.
      // Gated to ≥2 alive players: with a lone survivor there's no rival to out-rank and no bounty target, so a
      // crown would be meaningless noise — null hides it everywhere at once.
      crownId: computed(() => {
        const players = store.state()?.players ?? [];

        if (players.filter((player) => player.status === 'alive').length < 2) {
          return null;
        }

        return crownIdOf(players);
      }),
      me: computed(() => {
        const id = store.myId();

        return store.state()?.players.find((player) => player.id === id) ?? null;
      }),
      presenceCount: computed(() => store.state()?.players.length ?? 0),
    };
  }),
  withMethods(
    (
      store,
      socket = inject(FrenzySocketService),
      persistence = inject(PlayerPersistenceService),
    ) => ({
      click(itemId: string, nudgeX?: number, nudgeY?: number): void {
        socket.send({ type: 'click', itemId, nudgeX, nudgeY });
      },
      connect(roomId = 'feeding-frenzy'): void {
        const token = persistence.getOrCreateToken();

        patchState(store, { myId: token });
        socket.connect(roomId);
      },
      disconnect(): void {
        socket.disconnect();
      },
      dismissFainted(): void {
        patchState(store, { myFaintedAt: null });
      },
      join(name: string, appearance: string, body: PlayerBody): void {
        persistence.saveName(name);
        persistence.saveAppearance(appearance);
        patchState(store, {
          myFaintedAt: null,
          myFaintCause: null,
          myKillerName: null,
          joinError: null,
        });
        socket.send({ type: 'join', name, appearance, body });
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

            if (message.type === 'joinRejected') {
              next.joinError = message.reason;
            }

            if (message.type === 'fainted' && message.playerId === current.myId) {
              const cause = message.cause ?? null;

              next.myFaintedAt = Date.now();
              next.myFaintCause = cause;
              // Resolve the culprit's name from the pre-removal snapshot (the killer is a different, still-present
              // player); null unless a culprit is named — an owned item (easter-egg/poop emission) or a rival that
              // rammed us to death (bump). Both carry `killerId`, so one lookup serves both.
              next.myKillerName =
                cause !== null && 'killerId' in cause && cause.killerId !== undefined
                  ? (current.state?.players.find((player) => player.id === cause.killerId)?.name ??
                    null)
                  : null;
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
