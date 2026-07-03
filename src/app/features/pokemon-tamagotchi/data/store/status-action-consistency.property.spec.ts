import * as fc from 'fast-check';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import {
  applyStatusDecayState,
  careForPokemonState,
  completeTrainingState,
  feedPokemonState,
  interactWithPokemonState,
  playWithPokemonState,
  selectPokemonState,
  startTrainingState,
  updateStatusState,
  waterPokemonState,
} from './tamagotchi-state-transitions';
import { initialTamagotchiState } from './tamagotchi-initial';
import {
  arbitraryCareAction,
  arbitraryPokemonStatus,
  type CareAction,
  TEST_POKEMON,
} from '../fixtures/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;
const FIXED_NOW = 1_700_000_000_000;
const FIXED_TRAINING_REWARD = 25;

function isBoundedStatus(status: PokemonStatusModel): boolean {
  const { MAXIMUM, MINIMUM } = GAME_BALANCE.THRESHOLDS;

  return (
    status.health >= MINIMUM &&
    status.health <= MAXIMUM &&
    status.hunger >= MINIMUM &&
    status.hunger <= MAXIMUM &&
    status.mood >= MINIMUM &&
    status.mood <= MAXIMUM &&
    status.energy >= MINIMUM &&
    status.energy <= MAXIMUM &&
    status.hydration >= MINIMUM &&
    status.hydration <= MAXIMUM
  );
}

function applyCareAction(state: TamagotchiStateModel, action: CareAction): TamagotchiStateModel {
  switch (action.kind) {
    case 'applyStatusDecay':
      return applyStatusDecayState(state, action.decay!);

    case 'care':
      return careForPokemonState(state, FIXED_NOW);

    case 'feed':
      return feedPokemonState(state, FIXED_NOW);

    case 'interact':
      return interactWithPokemonState(state, action.interaction!, FIXED_NOW);

    case 'play':
      return playWithPokemonState(state, FIXED_NOW);

    case 'train': {
      const started = startTrainingState(state, FIXED_NOW, FIXED_TRAINING_REWARD);

      if (started.trainingStartedAt === null) {
        return started;
      }

      return completeTrainingState(started, FIXED_NOW, FIXED_TRAINING_REWARD);
    }

    case 'updateStatus':
      return updateStatusState(state, action.statusUpdate!);

    case 'water':
      return waterPokemonState(state, FIXED_NOW);
  }
}

function stateWithPokemon(status: PokemonStatusModel, isSleeping: boolean): TamagotchiStateModel {
  const selected = selectPokemonState(initialTamagotchiState, TEST_POKEMON);

  return {
    ...selected,
    isSleeping,
    status,
  };
}

describe('tamagotchi-state-transitions', () => {
  describe('Property 1: согласованность действий со статусом', () => {
    // Feature: pokemon-tamagotchi, Property 1: Status Action Consistency
    describe('Happy Path', () => {
      it('должен сохранять ограниченные значения статуса после любого действия ухода', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.boolean(),
            arbitraryCareAction(),
            (status, isSleeping, action) => {
              const state = stateWithPokemon(status, isSleeping);
              const next = applyCareAction(state, action);

              return isBoundedStatus(next.status);
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен сохранять ограниченные значения статуса после последовательности действий ухода', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.boolean(),
            fc.array(arbitraryCareAction(), { maxLength: 8, minLength: 1 }),
            (status, isSleeping, actions) => {
              let state = stateWithPokemon(status, isSleeping);

              for (const action of actions) {
                state = applyCareAction(state, action);

                if (!isBoundedStatus(state.status)) {
                  return false;
                }
              }

              return true;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
