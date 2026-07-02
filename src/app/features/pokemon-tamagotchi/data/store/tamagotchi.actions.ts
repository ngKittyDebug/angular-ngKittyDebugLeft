import { createAction, props } from '@ngrx/store';
import type { InteractionEvent } from '../../models/interaction.model';
import type { Notification } from '../../models/notification.model';
import type { Pokemon } from '../../models/pokemon.model';
import type { StatusDecay, StatusUpdate } from '../../models/pokemon-status.model';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import type { GarbageCollectLimits } from '../helpers/memory-management.helper';

export const selectPokemon = createAction(
  '[Tamagotchi] Select Pokemon',
  props<{ pokemon: Pokemon }>(),
);

export const clearPokemon = createAction('[Tamagotchi] Clear Pokemon');

export const feedPokemon = createAction('[Tamagotchi] Feed Pokemon');

export const waterPokemon = createAction('[Tamagotchi] Water Pokemon');

export const careForPokemon = createAction('[Tamagotchi] Care For Pokemon');

export const playWithPokemon = createAction('[Tamagotchi] Play With Pokemon');

export const startTraining = createAction('[Tamagotchi] Start Training');

export const completeTraining = createAction('[Tamagotchi] Complete Training');

export const putToSleep = createAction('[Tamagotchi] Put To Sleep');

export const wakeUp = createAction('[Tamagotchi] Wake Up');

export const interactWithPokemon = createAction(
  '[Tamagotchi] Interact With Pokemon',
  props<{ interaction: InteractionEvent }>(),
);

export const updateStatus = createAction(
  '[Tamagotchi] Update Status',
  props<{ statusUpdate: StatusUpdate }>(),
);

export const applyStatusDecay = createAction(
  '[Tamagotchi] Apply Status Decay',
  props<{ decay: StatusDecay }>(),
);

export const checkEvolution = createAction('[Tamagotchi] Check Evolution');

export const startEvolution = createAction('[Tamagotchi] Start Evolution');

export const completeEvolution = createAction(
  '[Tamagotchi] Complete Evolution',
  props<{ evolvedPokemon: Pokemon }>(),
);

export const addNotification = createAction(
  '[Tamagotchi] Add Notification',
  props<{ notification: Notification }>(),
);

export const dismissNotification = createAction(
  '[Tamagotchi] Dismiss Notification',
  props<{ id: string }>(),
);

export const initializeTamagotchi = createAction('[Tamagotchi] Initialize');

export const loadState = createAction('[Tamagotchi] Load State');

export const loadStateSuccess = createAction(
  '[Tamagotchi] Load State Success',
  props<{ state: TamagotchiState }>(),
);

export const saveState = createAction('[Tamagotchi] Save State');

export const saveStateSuccess = createAction(
  '[Tamagotchi] Save State Success',
  props<{ savedAt: number; cloudSynced: boolean }>(),
);

export const resetState = createAction('[Tamagotchi] Reset State');

export const setError = createAction('[Tamagotchi] Set Error', props<{ error: string }>());

export const clearError = createAction('[Tamagotchi] Clear Error');

export const garbageCollect = createAction(
  '[Tamagotchi] Garbage Collect',
  props<{ limits: GarbageCollectLimits }>(),
);
