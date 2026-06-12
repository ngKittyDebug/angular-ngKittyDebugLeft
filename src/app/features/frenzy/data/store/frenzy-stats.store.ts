import { computed, inject } from '@angular/core';
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

import { FRENZY } from '@game/frenzy/config';
import type { ItemType, ServerMessage, Stage } from '@game/frenzy/types';

import { FrenzyStore } from './frenzy.store';
import { FrenzySocketService } from '../services/frenzy-socket.service';

type EatenCounts = Record<ItemType, number>;

interface FrenzyStatsState {
  eatenByType: EatenCounts;
  endedAt: number | null;
  maxMass: number;
  maxStage: Stage;
  startedAt: number | null;
}

// `bomb`, `vitamin`, `shield` and `easterEgg` are never "eaten" (bomb explodes; the others grant effects),
// so their counts stay 0 and the fainted breakdown skips them.
function emptyCounts(): EatenCounts {
  return {
    food: 0,
    rotten: 0,
    rock: 0,
    rareCandy: 0,
    bomb: 0,
    goldenBerry: 0,
    crumb: 0,
    mushroom: 0,
    vitamin: 0,
    shield: 0,
    easterEgg: 0,
  };
}

const initialState: FrenzyStatsState = {
  eatenByType: emptyCounts(),
  endedAt: null,
  maxMass: 0,
  maxStage: 1,
  startedAt: null,
};

function accumulate(current: FrenzyStatsState, message: ServerMessage): Partial<FrenzyStatsState> {
  switch (message.type) {
    case 'eaten': {
      return {
        eatenByType: {
          ...current.eatenByType,
          [message.itemType]: current.eatenByType[message.itemType] + 1,
        },
        maxMass: Math.max(current.maxMass, message.newMass),
      };
    }

    case 'evolved': {
      return {
        maxStage: message.newStage > current.maxStage ? message.newStage : current.maxStage,
      };
    }

    case 'fainted': {
      return { endedAt: Date.now() };
    }

    default: {
      return {};
    }
  }
}

function ownerOf(message: ServerMessage): string | null {
  if (message.type === 'eaten' || message.type === 'evolved' || message.type === 'fainted') {
    return message.playerId;
  }

  return null;
}

export const FrenzyStatsStore = signalStore(
  withState(initialState),
  withComputed((store) => ({
    lifespanSeconds: computed(() => {
      const startedAt = store.startedAt();
      const endedAt = store.endedAt();

      if (startedAt === null || endedAt === null) {
        return 0;
      }

      return Math.max(0, Math.round((endedAt - startedAt) / 1000));
    }),
    totalEaten: computed(() =>
      Object.values(store.eatenByType()).reduce((sum, count) => sum + count, 0),
    ),
  })),
  withMethods((store) => ({
    startSession(): void {
      patchState(store, {
        eatenByType: emptyCounts(),
        endedAt: null,
        maxMass: FRENZY.startingMass,
        maxStage: 1,
        startedAt: Date.now(),
      });
    },
  })),
  withHooks({
    onInit(store) {
      const socket = inject(FrenzySocketService);
      const frenzy = inject(FrenzyStore);
      const consume = rxMethod<ServerMessage>(
        tap((message) => {
          if (store.startedAt() === null || ownerOf(message) !== frenzy.myId()) {
            return;
          }

          patchState(store, (current) => accumulate(current, message));
        }),
      );

      consume(socket.messages$);
    },
  }),
);
