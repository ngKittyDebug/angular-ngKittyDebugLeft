import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { TamagotchiErrorRecoveryService } from '../services/tamagotchi-error-recovery.service';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import { TEST_POKEMON } from '../testing/tamagotchi-arbitraries';
import { selectPokemonState, startTrainingState } from './tamagotchi-state-transitions';
import { createInitialTamagotchiState, initialTamagotchiState } from './tamagotchi-initial';
import { TamagotchiStore } from './tamagotchi.store';

describe('TamagotchiStore', () => {
  describe('loadFromPersistence', () => {
    it('should set error and remain initialized when persistence load throws', () => {
      let shouldThrow = true;
      const load = vi.fn(() => {
        if (shouldThrow) {
          throw new Error('storage corrupted');
        }

        return null;
      });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiStore,
          {
            provide: TamagotchiPersistenceService,
            useValue: {
              clear: vi.fn(),
              load,
              save: vi.fn(),
            },
          },
          {
            provide: TamagotchiErrorRecoveryService,
            useValue: {
              logError: vi.fn(),
            },
          },
        ],
      });

      const store = TestBed.inject(TamagotchiStore);

      store.loadFromPersistence();
      expect(store.error()).toBe(TAMAGOTCHI_SYSTEM_ERRORS.LOAD_FAILED);
      expect(store.initialized()).toBe(true);

      shouldThrow = false;
      store.loadFromPersistence();

      expect(store.initialized()).toBe(true);
      expect(load).toHaveBeenCalledTimes(2);
    });

    it('should load persisted state on a subsequent successful call', () => {
      const persisted = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);
      const load = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('storage corrupted');
        })
        .mockImplementationOnce(() => ({
          recoveredFromBackup: false,
          state: persisted,
        }));

      TestBed.configureTestingModule({
        providers: [
          TamagotchiStore,
          {
            provide: TamagotchiPersistenceService,
            useValue: {
              clear: vi.fn(),
              load,
              save: vi.fn(),
            },
          },
          {
            provide: TamagotchiErrorRecoveryService,
            useValue: {
              logError: vi.fn(),
            },
          },
        ],
      });

      const store = TestBed.inject(TamagotchiStore);

      store.loadFromPersistence();
      store.loadFromPersistence();

      expect(store.pokemon()?.id).toBe(TEST_POKEMON.id);
      expect(load).toHaveBeenCalledTimes(2);
    });
  });
});

describe('tamagotchiStateTransitions training determinism', () => {
  const fixedNow = 1_700_000_000_000;
  const fixedReward = 42;

  it('should produce identical training state for the same inputs', () => {
    const selected = selectPokemonState(initialTamagotchiState, TEST_POKEMON);
    const first = startTrainingState(selected, fixedNow, fixedReward);
    const second = startTrainingState(selected, fixedNow, fixedReward);

    expect(first).toEqual(second);
    expect(first.trainingExperienceReward).toBe(fixedReward);
    expect(first.trainingStartedAt).toBe(fixedNow);
  });
});
