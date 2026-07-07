import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import type { EvolutionProgressModel } from '../models/evolution.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import { arbitraryTamagotchiState } from '../fixtures/tamagotchi-arbitraries';
import { syncEvolutionProgressWithPokemon } from '../store/tamagotchi-state-transitions';
import { TamagotchiPersistenceService } from './tamagotchi-persistence.service';

const PROPERTY_RUNS = 100;

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeJsonValue(nested)]),
  );
}

function areEquivalentJsonValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeJsonValue(left)) === JSON.stringify(normalizeJsonValue(right));
}

function statusWithoutSaveTimestamp(
  status: PokemonStatusModel,
): Omit<PokemonStatusModel, 'lastSaveTime'> {
  const { lastSaveTime, ...rest } = status;

  void lastSaveTime;

  return rest;
}

function expectedEvolutionProgressAfterLoad(
  original: TamagotchiStateModel,
): EvolutionProgressModel {
  if (!original.pokemon) {
    return original.evolutionProgress;
  }

  return syncEvolutionProgressWithPokemon(original).evolutionProgress;
}

function assertPersistedEquivalence(
  original: TamagotchiStateModel,
  loaded: TamagotchiStateModel,
): boolean {
  if (!areEquivalentJsonValues(loaded.pokemon, original.pokemon)) {
    return false;
  }

  if (!areEquivalentJsonValues(loaded.achievementList, original.achievementList)) {
    return false;
  }

  if (
    !areEquivalentJsonValues(loaded.evolutionProgress, expectedEvolutionProgressAfterLoad(original))
  ) {
    return false;
  }

  if (!areEquivalentJsonValues(loaded.dailyRoutine, original.dailyRoutine)) {
    return false;
  }

  if (!areEquivalentJsonValues(loaded.interactionHistory, original.interactionHistory)) {
    return false;
  }

  if (!areEquivalentJsonValues(loaded.notificationList, original.notificationList)) {
    return false;
  }

  if (loaded.isSleeping !== original.isSleeping) {
    return false;
  }

  if (loaded.initialized !== original.initialized) {
    return false;
  }

  if (loaded.error !== original.error) {
    return false;
  }

  if (loaded.lastActionTime !== original.lastActionTime) {
    return false;
  }

  if (loaded.lastDecayTime !== original.lastDecayTime) {
    return false;
  }

  if (
    !areEquivalentJsonValues(
      statusWithoutSaveTimestamp(loaded.status),
      statusWithoutSaveTimestamp(original.status),
    )
  ) {
    return false;
  }

  if (typeof loaded.lastSaveTime !== 'number' || typeof loaded.status.lastSaveTime !== 'number') {
    return false;
  }

  if (loaded.isEvolving !== false) {
    return false;
  }

  if (loaded.trainingStartedAt !== original.trainingStartedAt) {
    return false;
  }

  if (loaded.trainingExperienceReward !== original.trainingExperienceReward) {
    return false;
  }

  return true;
}

describe('TamagotchiPersistenceService', () => {
  describe('Property 6: round-trip сохранения состояния', () => {
    // Feature: pokemon-tamagotchi, Property 6: State Persistence Round-Trip
    let service: TamagotchiPersistenceService;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({});
      service = TestBed.inject(TamagotchiPersistenceService);
    });

    describe('Happy Path', () => {
      it('должен восстанавливать эквивалентное состояние после сохранения и загрузки', () => {
        fc.assert(
          fc.property(arbitraryTamagotchiState(), (state) => {
            service.clear();
            service.save(state);
            const loaded = service.load();

            if (!loaded || loaded.recoveredFromBackup) {
              return false;
            }

            return assertPersistedEquivalence(state, loaded.state);
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен сохранять метрики прогресса и метки времени при round-trip', () => {
        fc.assert(
          fc.property(arbitraryTamagotchiState(), (state) => {
            service.clear();
            service.save(state);
            const loaded = service.load();

            if (!loaded) {
              return false;
            }

            return (
              loaded.state.status.experience === state.status.experience &&
              loaded.state.status.level === state.status.level &&
              loaded.state.status.lastCareTime === state.status.lastCareTime &&
              loaded.state.status.lastFeedTime === state.status.lastFeedTime &&
              loaded.state.status.lastPlayTime === state.status.lastPlayTime &&
              loaded.state.status.lastSleepTime === state.status.lastSleepTime &&
              loaded.state.status.lastTrainTime === state.status.lastTrainTime &&
              loaded.state.status.lastHydrationTime === state.status.lastHydrationTime &&
              loaded.state.lastSaveTime === loaded.state.status.lastSaveTime
            );
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
