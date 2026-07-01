import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import type { PokemonStatus } from '../../models/pokemon-status.model';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import { arbitraryTamagotchiState } from '../testing/tamagotchi-arbitraries';
import { TamagotchiPersistenceService } from './tamagotchi-persistence.service';

const PROPERTY_RUNS = 100;

function statusWithoutSaveTimestamp(status: PokemonStatus): Omit<PokemonStatus, 'lastSaveTime'> {
  const { lastSaveTime, ...rest } = status;

  void lastSaveTime;

  return rest;
}

function assertPersistedEquivalence(original: TamagotchiState, loaded: TamagotchiState): boolean {
  if (JSON.stringify(loaded.pokemon) !== JSON.stringify(original.pokemon)) {
    return false;
  }

  if (JSON.stringify(loaded.achievements) !== JSON.stringify(original.achievements)) {
    return false;
  }

  if (JSON.stringify(loaded.evolutionProgress) !== JSON.stringify(original.evolutionProgress)) {
    return false;
  }

  if (JSON.stringify(loaded.dailyRoutine) !== JSON.stringify(original.dailyRoutine)) {
    return false;
  }

  if (JSON.stringify(loaded.interactionHistory) !== JSON.stringify(original.interactionHistory)) {
    return false;
  }

  if (JSON.stringify(loaded.notifications) !== JSON.stringify(original.notifications)) {
    return false;
  }

  if (JSON.stringify(loaded.customization) !== JSON.stringify(original.customization)) {
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
    JSON.stringify(statusWithoutSaveTimestamp(loaded.status)) !==
    JSON.stringify(statusWithoutSaveTimestamp(original.status))
  ) {
    return false;
  }

  if (typeof loaded.lastSaveTime !== 'number' || typeof loaded.status.lastSaveTime !== 'number') {
    return false;
  }

  if (loaded.activeMiniGame !== null || loaded.isEvolving !== false) {
    return false;
  }

  return true;
}

describe('Tamagotchi property tests', () => {
  describe('Property 6: State Persistence Round-Trip', () => {
    // Feature: pokemon-tamagotchi, Property 6: State Persistence Round-Trip
    let service: TamagotchiPersistenceService;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({});
      service = TestBed.inject(TamagotchiPersistenceService);
    });

    it('should recover an equivalent state after save and load', () => {
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

    it('should preserve progression metrics and timestamps across round-trip', () => {
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
            loaded.state.status.lastFeedTime === state.status.lastFeedTime &&
            loaded.state.status.lastPlayTime === state.status.lastPlayTime &&
            loaded.state.status.lastSleepTime === state.status.lastSleepTime &&
            loaded.state.status.lastHydrationTime === state.status.lastHydrationTime &&
            loaded.state.lastSaveTime === loaded.state.status.lastSaveTime
          );
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });
});
