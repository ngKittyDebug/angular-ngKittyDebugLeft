import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import { createTamagotchiLoggerMock } from '../services/tamagotchi-logger.service.mock';
import { TamagotchiLoggerService } from '../services/tamagotchi-logger.service';
import {
  createTamagotchiPersistenceMock,
  type TamagotchiPersistenceMock,
} from '../services/tamagotchi-persistence.service.mock';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import { createInitialTamagotchiState } from './tamagotchi-initial';
import { selectPokemonState } from './tamagotchi-state-transitions';
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

function createStoreTestBedWithMocks(
  persistence: TamagotchiPersistenceMock = createTamagotchiPersistenceMock(),
): {
  persistence: TamagotchiPersistenceMock;
  store: InstanceType<typeof TamagotchiStore>;
} {
  TestBed.configureTestingModule({
    providers: [
      TamagotchiStore,
      { provide: TamagotchiPersistenceService, useValue: persistence },
      { provide: TamagotchiLoggerService, useValue: createTamagotchiLoggerMock() },
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
        const persistence = createTamagotchiPersistenceMock({
          load: vi.fn(() => {
            throw new Error('storage corrupted');
          }),
        });
        const { store } = createStoreTestBedWithMocks(persistence);

        store.loadFromPersistence();

        expect(store.error()).toBe(TAMAGOTCHI_SYSTEM_ERRORS.LOAD_FAILED);
        expect(store.initialized()).toBe(true);
        expect(persistence.load).toHaveBeenCalledTimes(1);
      });
    });

    describe('Happy Path', () => {
      it('должен загрузить сохранённое состояние из persistence', () => {
        const persisted = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);
        const persistence = createTamagotchiPersistenceMock({
          load: vi.fn(() => ({
            recoveredFromBackup: false,
            state: persisted,
          })),
        });
        const { store } = createStoreTestBedWithMocks(persistence);

        store.loadFromPersistence();

        expect(store.pokemon()?.id).toBe(TEST_POKEMON.id);
        expect(store.initialized()).toBe(true);
        expect(persistence.load).toHaveBeenCalledTimes(1);
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
        expect(persistence.save).toHaveBeenCalledTimes(0);

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
        expect(persistence.save).toHaveBeenCalledTimes(0);
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
