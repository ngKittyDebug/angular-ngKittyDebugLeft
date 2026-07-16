import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { TamagotchiLoggerService } from '../services/tamagotchi-logger.service';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import {
  restartTrainingTimerState,
  selectPokemonState,
  startTrainingState,
} from './tamagotchi-state-transitions';
import { createInitialTamagotchiState, initialTamagotchiState } from './tamagotchi-initial';
import { TamagotchiStore } from './tamagotchi.store';

type TamagotchiPersistenceMock = MockedObject<
  Pick<TamagotchiPersistenceService, 'clear' | 'load' | 'save'>
>;

type TamagotchiLoggerMock = MockedObject<Pick<TamagotchiLoggerService, 'logError'>>;

function createPersistenceMock(
  overrides: Partial<TamagotchiPersistenceMock> = {},
): TamagotchiPersistenceMock {
  return {
    clear: vi.fn(),
    load: vi.fn(() => null),
    save: vi.fn(),
    ...overrides,
  } as const satisfies TamagotchiPersistenceMock;
}

function createLoggerMock(): TamagotchiLoggerMock {
  return {
    logError: vi.fn(),
  } as const satisfies TamagotchiLoggerMock;
}

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

function createStoreTestBedWithMocks(
  persistence: TamagotchiPersistenceMock = createPersistenceMock(),
): {
  persistence: TamagotchiPersistenceMock;
  store: InstanceType<typeof TamagotchiStore>;
} {
  TestBed.configureTestingModule({
    providers: [
      TamagotchiStore,
      { provide: TamagotchiPersistenceService, useValue: persistence },
      { provide: TamagotchiLoggerService, useValue: createLoggerMock() },
    ],
  });

  return { persistence, store: TestBed.inject(TamagotchiStore) };
}

function createStoreTestBed(): InstanceType<typeof TamagotchiStore> {
  return createStoreTestBedWithMocks().store;
}

describe('TamagotchiStore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadFromPersistence', () => {
    describe('Negative Cases', () => {
      it('должен установить ошибку и остаться инициализированным, когда загрузка persistence бросает исключение', () => {
        let shouldThrow = true;
        const persistence = createPersistenceMock({
          load: vi.fn(() => {
            if (shouldThrow) {
              throw new Error('storage corrupted');
            }

            return null;
          }),
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiStore,
            { provide: TamagotchiPersistenceService, useValue: persistence },
            { provide: TamagotchiLoggerService, useValue: createLoggerMock() },
          ],
        });

        const store = TestBed.inject(TamagotchiStore);

        store.loadFromPersistence();
        expect(store.error()).toBe(TAMAGOTCHI_SYSTEM_ERRORS.LOAD_FAILED);
        expect(store.initialized()).toBe(true);

        shouldThrow = false;
        store.loadFromPersistence();

        expect(store.initialized()).toBe(true);
        expect(persistence.load).toHaveBeenCalledTimes(2);
      });
    });

    describe('Happy Path', () => {
      it('должен загрузить сохранённое состояние при последующем успешном вызове', () => {
        const persisted = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);
        const persistence = createPersistenceMock({
          load: vi
            .fn()
            .mockImplementationOnce(() => {
              throw new Error('storage corrupted');
            })
            .mockImplementationOnce(() => ({
              recoveredFromBackup: false,
              state: persisted,
            })),
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiStore,
            { provide: TamagotchiPersistenceService, useValue: persistence },
            { provide: TamagotchiLoggerService, useValue: createLoggerMock() },
          ],
        });

        const store = TestBed.inject(TamagotchiStore);

        store.loadFromPersistence();
        store.loadFromPersistence();

        expect(store.pokemon()?.id).toBe(TEST_POKEMON.id);
        expect(persistence.load).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Happy Path', () => {
    describe('сохранение состояния', () => {
      it('должен схлопывать несколько изменений в один debounced save', () => {
        vi.useFakeTimers();
        const { persistence, store } = createStoreTestBedWithMocks();
        const fixedNow = 1_700_000_000_000;

        store.selectPokemon(TEST_POKEMON);
        store.feed(fixedNow);

        vi.advanceTimersByTime(299);
        expect(persistence.save).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);

        expect(persistence.save).toHaveBeenCalledTimes(1);
      });

      it('должен сохранять pending state при flushSave', () => {
        vi.useFakeTimers();
        const { persistence, store } = createStoreTestBedWithMocks();

        store.selectPokemon(TEST_POKEMON);
        store.flushSave();
        vi.advanceTimersByTime(300);

        expect(persistence.save).toHaveBeenCalledTimes(1);
        expect(persistence.save).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pokemon: TEST_POKEMON }),
        );
      });

      it('не должен записывать пустой payload после resetState', () => {
        vi.useFakeTimers();
        const { persistence, store } = createStoreTestBedWithMocks();

        store.selectPokemon(TEST_POKEMON);
        persistence.save.mockClear();
        store.resetState();
        store.flushSave();
        vi.advanceTimersByTime(300);

        expect(persistence.clear).toHaveBeenCalledTimes(1);
        expect(persistence.save).not.toHaveBeenCalled();
      });
    });

    describe('интеграция эволюции', () => {
      const fixedNow = 1_700_000_000_000;
      const experienceGain = GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE;

      it('должен достигать canEvolve после тренировки при выполнении порогов уровня, опыта и заботы', () => {
        const store = createStoreTestBed();

        store.selectPokemon(EVOLVABLE_TEST_POKEMON);
        store.startTraining(fixedNow, experienceGain);
        store.completeTraining(
          fixedNow + GAME_BALANCE.ACTION_EFFECTS.TRAIN.durationMs,
          experienceGain,
        );
        store.checkEvolution();

        expect(store.status().experience).toBe(experienceGain);
        expect(store.status().level).toBeGreaterThanOrEqual(GAME_BALANCE.EVOLUTION.MIN_LEVEL);
        expect(store.evolutionProgress().currentProgress['care']).toBeGreaterThanOrEqual(
          GAME_BALANCE.EVOLUTION.MIN_CARE_SCORE,
        );
        expect(store.canEvolve()).toBe(true);
      });

      it('должен разрешать startEvolution, когда требования выполнены', () => {
        const store = createStoreTestBed();

        store.selectPokemon(EVOLVABLE_TEST_POKEMON);
        store.startTraining(fixedNow, experienceGain);
        store.completeTraining(
          fixedNow + GAME_BALANCE.ACTION_EFFECTS.TRAIN.durationMs,
          experienceGain,
        );
        store.checkEvolution();
        store.startEvolution();

        expect(store.isEvolving()).toBe(true);
      });
    });
  });
});

describe('tamagotchiStateTransitions', () => {
  describe('Happy Path', () => {
    describe('детерминизм тренировки', () => {
      const fixedNow = 1_700_000_000_000;
      const fixedReward = 42;

      it('должен давать идентичное состояние тренировки для одинаковых входных данных', () => {
        const selected = selectPokemonState(initialTamagotchiState, TEST_POKEMON);
        const first = startTrainingState(selected, fixedNow, fixedReward);
        const second = startTrainingState(selected, fixedNow, fixedReward);

        expect(first).toEqual(second);
        expect(first.trainingExperienceReward).toBe(fixedReward);
        expect(first.trainingStartedAt).toBe(fixedNow);
      });

      it('должен перезапускать таймер тренировки без изменения награды', () => {
        const selected = selectPokemonState(initialTamagotchiState, TEST_POKEMON);
        const training = startTrainingState(selected, fixedNow, fixedReward);
        const restarted = restartTrainingTimerState(training, fixedNow + 10_000);

        expect(restarted.trainingStartedAt).toBe(fixedNow + 10_000);
        expect(restarted.trainingExperienceReward).toBe(fixedReward);
      });
    });
  });
});
