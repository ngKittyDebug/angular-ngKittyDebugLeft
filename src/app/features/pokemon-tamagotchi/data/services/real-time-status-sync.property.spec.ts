import * as fc from 'fast-check';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { arbitraryPokemonStatus, TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import {
  DISPLAYED_STATUS_TYPE_LIST,
  maxValueForStatusType,
  statusValueForType,
} from '../helpers/status-indicator-sync.helper';
import type { PokemonStatusModel, StatusType } from '../models/pokemon-status.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import { initialTamagotchiState } from '../store/tamagotchi-initial';
import {
  careForPokemonState,
  feedPokemonState,
  playWithPokemonState,
  selectPokemonState,
  waterPokemonState,
} from '../store/tamagotchi-state-transitions';

const PROPERTY_RUNS = 100;
const FIXED_NOW = 1_700_000_000_000;

const STATUS_FIELD_BY_TYPE: Record<StatusType, keyof PokemonStatusModel> = {
  energy: 'energy',
  experience: 'experience',
  health: 'health',
  hunger: 'hunger',
  hydration: 'hydration',
  mood: 'mood',
};

function stateWithPokemon(status: PokemonStatusModel): TamagotchiStateModel {
  const selected = selectPokemonState(initialTamagotchiState, TEST_POKEMON);

  return {
    ...selected,
    status,
  };
}

function displayedMatchesStatus(status: PokemonStatusModel): boolean {
  return DISPLAYED_STATUS_TYPE_LIST.every((statusType) => {
    const field = STATUS_FIELD_BY_TYPE[statusType];

    return statusValueForType(statusType, status) === status[field];
  });
}

describe('status-indicator-sync.helper', () => {
  describe('Property 7: синхронизация статуса в реальном времени', () => {
    // Feature: pokemon-tamagotchi, Property 7: Real-Time Status Synchronization
    describe('Happy Path', () => {
      it('должен покрывать все отображаемые типы прямым чтением полей статуса', () => {
        fc.assert(
          fc.property(arbitraryPokemonStatus(), (status) => displayedMatchesStatus(status)),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен сохранять синхронизацию отображаемых значений после feed/water/care/play', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.constantFrom('feed', 'water', 'care', 'play' as const),
            (initialStatus, action) => {
              const before = stateWithPokemon(initialStatus);
              const after =
                action === 'feed'
                  ? feedPokemonState(before, FIXED_NOW)
                  : action === 'water'
                    ? waterPokemonState(before, FIXED_NOW)
                    : action === 'care'
                      ? careForPokemonState(before, FIXED_NOW)
                      : playWithPokemonState(before, FIXED_NOW);

              return displayedMatchesStatus(after.status);
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен отражать рост hunger после feed и hydration после water', () => {
        fc.assert(
          fc.property(fc.integer({ max: 60, min: 0 }), (base) => {
            const status: PokemonStatusModel = {
              energy: 80,
              experience: 0,
              health: 80,
              hunger: base,
              hydration: base,
              lastCareTime: null,
              lastFeedTime: null,
              lastHydrationTime: null,
              lastPlayTime: null,
              lastSaveTime: null,
              lastSleepTime: null,
              lastTrainTime: null,
              level: 1,
              mood: 80,
            };
            const state = stateWithPokemon(status);
            const fed = feedPokemonState(state, FIXED_NOW);
            const watered = waterPokemonState(state, FIXED_NOW + 1);

            const hungerGrew =
              statusValueForType('hunger', fed.status) > statusValueForType('hunger', status);
            const hydrationGrew =
              statusValueForType('hydration', watered.status) >
              statusValueForType('hydration', status);
            const hungerDelta = statusValueForType('hunger', fed.status) - status.hunger;
            const hydrationDelta =
              statusValueForType('hydration', watered.status) - status.hydration;

            return (
              hungerGrew &&
              hydrationGrew &&
              hungerDelta ===
                Math.min(
                  GAME_BALANCE.ACTION_EFFECTS.FEED.hungerIncrease,
                  GAME_BALANCE.THRESHOLDS.MAXIMUM - status.hunger,
                ) &&
              hydrationDelta ===
                Math.min(
                  GAME_BALANCE.ACTION_EFFECTS.WATER.hydrationIncrease,
                  GAME_BALANCE.THRESHOLDS.MAXIMUM - status.hydration,
                )
            );
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });

    describe('Edge Cases', () => {
      it('должен держать value >= 0 и value <= max для обычных статусов; experience может превысить порог', () => {
        fc.assert(
          fc.property(arbitraryPokemonStatus(), (status) => {
            return DISPLAYED_STATUS_TYPE_LIST.every((statusType) => {
              const value = statusValueForType(statusType, status);
              const max = maxValueForStatusType(statusType);

              if (value < 0 || max <= 0) {
                return false;
              }

              // Experience above the evolution threshold is a valid ready-to-evolve state.
              if (statusType === 'experience') {
                return true;
              }

              return value <= max;
            });
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен использовать порог эволюции как max для experience и MAXIMUM для остальных', () => {
        expect(maxValueForStatusType('experience')).toBe(GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE);

        for (const statusType of DISPLAYED_STATUS_TYPE_LIST.filter(
          (type) => type !== 'experience',
        )) {
          expect(maxValueForStatusType(statusType)).toBe(GAME_BALANCE.THRESHOLDS.MAXIMUM);
        }
      });
    });
  });
});
