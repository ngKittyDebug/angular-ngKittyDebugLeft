import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { TamagotchiErrorRecoveryService } from '../services/tamagotchi-error-recovery.service';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import { selectPokemonState, startTrainingState } from './tamagotchi-state-transitions';
import { createInitialTamagotchiState, initialTamagotchiState } from './tamagotchi-initial';
import { TamagotchiStore } from './tamagotchi.store';

const EVOLVABLE_TEST_POKEMON: PokemonModel = {
  ...TEST_POKEMON,
  evolutionChain: {
    currentStage: 1,
    nextEvolution: {
      pokemonId: '26',
      requirements: EVOLUTION_REQUIREMENTS,
    },
    totalStages: 3,
  },
};

function createStoreTestBed(): InstanceType<typeof TamagotchiStore> {
  TestBed.configureTestingModule({
    providers: [
      TamagotchiStore,
      {
        provide: TamagotchiPersistenceService,
        useValue: {
          clear: vi.fn(),
          load: vi.fn(() => null),
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

  return TestBed.inject(TamagotchiStore);
}

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

describe('TamagotchiStore evolution integration', () => {
  const fixedNow = 1_700_000_000_000;
  const experienceGain = GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE;

  it('should reach canEvolve after training when level, experience, and care thresholds are met', () => {
    const store = createStoreTestBed();

    store.selectPokemon(EVOLVABLE_TEST_POKEMON);
    store.startTraining(fixedNow, experienceGain);
    store.completeTraining(fixedNow + GAME_BALANCE.ACTION_EFFECTS.TRAIN.durationMs, experienceGain);
    store.checkEvolution();

    expect(store.status().experience).toBe(experienceGain);
    expect(store.status().level).toBeGreaterThanOrEqual(GAME_BALANCE.EVOLUTION.MIN_LEVEL);
    expect(store.evolutionProgress().currentProgress['care']).toBeGreaterThanOrEqual(
      GAME_BALANCE.EVOLUTION.MIN_CARE_SCORE,
    );
    expect(store.canEvolve()).toBe(true);
  });

  it('should allow startEvolution when requirements are satisfied', () => {
    const store = createStoreTestBed();

    store.selectPokemon(EVOLVABLE_TEST_POKEMON);
    store.startTraining(fixedNow, experienceGain);
    store.completeTraining(fixedNow + GAME_BALANCE.ACTION_EFFECTS.TRAIN.durationMs, experienceGain);
    store.checkEvolution();
    store.startEvolution();

    expect(store.isEvolving()).toBe(true);
  });
});
