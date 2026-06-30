import * as fc from 'fast-check';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { PokemonStatus } from '../../models/pokemon-status.model';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import {
  applyStatusDecay,
  careForPokemon,
  feedPokemon,
  interactWithPokemon,
  playWithPokemon,
  selectPokemon,
  trainPokemon,
  updateStatus,
  waterPokemon,
} from './tamagotchi.actions';
import { tamagotchiReducer } from './tamagotchi.reducer';
import { initialTamagotchiState } from './tamagotchi.state';
import {
  arbitraryCareAction,
  arbitraryPokemonStatus,
  type CareAction,
  TEST_POKEMON,
} from '../testing/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;

function isBoundedStatus(status: PokemonStatus): boolean {
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

function applyCareAction(state: TamagotchiState, action: CareAction): TamagotchiState {
  switch (action.kind) {
    case 'applyStatusDecay':
      return tamagotchiReducer(state, applyStatusDecay({ decay: action.decay! }));

    case 'care':
      return tamagotchiReducer(state, careForPokemon());

    case 'feed':
      return tamagotchiReducer(state, feedPokemon());

    case 'interact':
      return tamagotchiReducer(state, interactWithPokemon({ interaction: action.interaction! }));

    case 'play':
      return tamagotchiReducer(state, playWithPokemon());

    case 'train':
      return tamagotchiReducer(state, trainPokemon({ gameResult: action.gameResult! }));

    case 'updateStatus':
      return tamagotchiReducer(state, updateStatus({ statusUpdate: action.statusUpdate! }));

    case 'water':
      return tamagotchiReducer(state, waterPokemon());
  }
}

function stateWithPokemon(status: PokemonStatus, isSleeping: boolean): TamagotchiState {
  const selected = tamagotchiReducer(
    initialTamagotchiState,
    selectPokemon({ pokemon: TEST_POKEMON }),
  );

  return {
    ...selected,
    isSleeping,
    status,
  };
}

describe('Tamagotchi property tests', () => {
  describe('Property 1: Status Action Consistency', () => {
    // Feature: pokemon-tamagotchi, Property 1: Status Action Consistency
    it('should keep bounded status values after any care action', () => {
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

    it('should keep bounded status values after a sequence of care actions', () => {
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
