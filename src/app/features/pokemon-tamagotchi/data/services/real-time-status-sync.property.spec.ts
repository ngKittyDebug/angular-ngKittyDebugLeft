import * as fc from 'fast-check';
import {
  computeIndicatorPercentage,
  indicatorsMatchStatus,
  maxValueForStatusType,
  projectAllStatusIndicators,
  projectStatusIndicator,
  statusValueForType,
} from '../helpers/status-indicator-sync.helper';
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
} from '../store/tamagotchi.actions';
import { tamagotchiReducer } from '../store/tamagotchi.reducer';
import { initialTamagotchiState } from '../store/tamagotchi.state';
import {
  arbitraryCareAction,
  arbitraryPokemonStatus,
  type CareAction,
  TEST_POKEMON,
} from '../testing/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;

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
  describe('Property 7: Real-Time Status Synchronization', () => {
    // Feature: pokemon-tamagotchi, Property 7: Real-Time Status Synchronization
    it('should keep projected indicator values equal to store status after any action sequence', () => {
      fc.assert(
        fc.property(
          arbitraryPokemonStatus(),
          fc.array(arbitraryCareAction(), { maxLength: 12, minLength: 1 }),
          fc.boolean(),
          (initialStatus, actions, isSleeping) => {
            let state = stateWithPokemon(initialStatus, isSleeping);

            for (const action of actions) {
              state = applyCareAction(state, action);
              const indicators = projectAllStatusIndicators(state.status);

              if (!indicatorsMatchStatus(state.status, indicators)) {
                return false;
              }
            }

            return true;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should derive indicator percentages directly from current status values', () => {
      fc.assert(
        fc.property(arbitraryPokemonStatus(), (status) => {
          const indicators = projectAllStatusIndicators(status);

          return indicators.every((indicator) => {
            const max = maxValueForStatusType(indicator.statusType);

            return (
              indicator.percentage === computeIndicatorPercentage(indicator.value, max) &&
              indicator.value === statusValueForType(indicator.statusType, status)
            );
          });
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should reflect every intermediate status change in indicator projections', () => {
      fc.assert(
        fc.property(
          arbitraryPokemonStatus(),
          fc.array(arbitraryCareAction(), { maxLength: 8, minLength: 2 }),
          (initialStatus, actions) => {
            let state = stateWithPokemon(initialStatus, false);
            let previousIndicators = projectAllStatusIndicators(state.status);

            for (const action of actions) {
              state = applyCareAction(state, action);
              const nextIndicators = projectAllStatusIndicators(state.status);

              for (const next of nextIndicators) {
                const previous = previousIndicators.find(
                  (indicator) => indicator.statusType === next.statusType,
                );

                if (!previous) {
                  return false;
                }

                const statusValue = statusValueForType(next.statusType, state.status);

                if (next.value !== statusValue) {
                  return false;
                }

                if (previous.value !== statusValue && next.value === previous.value) {
                  return false;
                }
              }

              if (!indicatorsMatchStatus(state.status, nextIndicators)) {
                return false;
              }

              previousIndicators = nextIndicators;
            }

            return true;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should keep indicator percentages monotonic with status value changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 100, min: 0 }),
          fc.integer({ max: 100, min: 0 }),
          (before, after) => {
            const statusBefore: PokemonStatus = {
              energy: before,
              experience: before,
              health: before,
              hunger: before,
              hydration: before,
              lastFeedTime: null,
              lastHydrationTime: null,
              lastPlayTime: null,
              lastSaveTime: null,
              lastSleepTime: null,
              level: 1,
              mood: before,
            };
            const statusAfter: PokemonStatus = { ...statusBefore, hunger: after };
            const indicatorBefore = projectStatusIndicator('hunger', statusBefore);
            const indicatorAfter = projectStatusIndicator('hunger', statusAfter);

            if (after > before) {
              return indicatorAfter.percentage >= indicatorBefore.percentage;
            }

            if (after < before) {
              return indicatorAfter.percentage <= indicatorBefore.percentage;
            }

            return indicatorAfter.percentage === indicatorBefore.percentage;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });
});
