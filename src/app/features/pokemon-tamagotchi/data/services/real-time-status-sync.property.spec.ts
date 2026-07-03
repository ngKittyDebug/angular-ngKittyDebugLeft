import * as fc from 'fast-check';
import {
  computeIndicatorPercentage,
  indicatorsMatchStatus,
  maxValueForStatusType,
  projectAllStatusIndicators,
  projectStatusIndicator,
  statusValueForType,
} from '../helpers/status-indicator-sync.helper';
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
} from '../store/tamagotchi-state-transitions';
import { initialTamagotchiState } from '../store/tamagotchi-initial';
import {
  arbitraryCareAction,
  arbitraryPokemonStatus,
  type CareAction,
  TEST_POKEMON,
} from '../fixtures/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;
const FIXED_NOW = 1_700_000_000_000;
const FIXED_TRAINING_REWARD = 25;

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
            const statusBefore: PokemonStatusModel = {
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
            const statusAfter: PokemonStatusModel = { ...statusBefore, hunger: after };
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
