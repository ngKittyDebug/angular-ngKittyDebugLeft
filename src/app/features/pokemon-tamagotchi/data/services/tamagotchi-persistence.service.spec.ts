import { TestBed } from '@angular/core/testing';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { createTamagotchiStorageMock } from '../fixtures/tamagotchi-storage.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import {
  TAMAGOTCHI_BACKUP_KEY,
  TAMAGOTCHI_STATE_VERSION,
  TAMAGOTCHI_STORAGE_KEY,
  TamagotchiPersistenceService,
} from './tamagotchi-persistence.service';
import { TamagotchiSelectionStorageService } from './tamagotchi-selection-storage.service';

describe('TamagotchiPersistenceService', () => {
  let service: TamagotchiPersistenceService;
  let storageMock: ReturnType<typeof createTamagotchiStorageMock>;

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    TestBed.configureTestingModule({
      providers: [
        TamagotchiPersistenceService,
        { provide: TamagotchiStorageService, useValue: storageMock },
        {
          provide: TamagotchiSelectionStorageService,
          useValue: { getReference: () => null },
        },
      ],
    });
    service = TestBed.inject(TamagotchiPersistenceService);
  });

  describe('Happy Path', () => {
    it('должен выполнять round-trip состояния тамагочи через localStorage', () => {
      const state = {
        ...createInitialTamagotchiState(),
        initialized: true,
        status: {
          ...createInitialTamagotchiState().status,
          hunger: 42,
          mood: 55,
        },
      };

      service.save(state);
      const loaded = service.load();

      expect(loaded).not.toBeNull();
      expect(loaded?.state.status.hunger).toBe(42);
      expect(loaded?.state.status.mood).toBe(55);
      expect(loaded?.recoveredFromBackup).toBe(false);
    });

    it('должен синхронизировать evolution requirements с chain покемона при загрузке', () => {
      const staleRequirements = [
        {
          type: 'level' as const,
          value: 1,
          description: 'Stale threshold',
        },
      ];
      const pokemon: PokemonModel = {
        ...TEST_POKEMON,
        evolutionChain: {
          currentStage: 2,
          nextEvolution: {
            pokemonId: 'venusaur',
            requirements: [
              {
                type: 'level',
                value: 99,
                description: 'Reach level 99',
              },
            ],
          },
          totalStages: 3,
        },
      };
      const state = {
        ...createInitialTamagotchiState(),
        evolutionProgress: {
          currentProgress: { level: 50 },
          isReady: false,
          readyNotifiedAt: null,
          requirements: staleRequirements,
        },
        initialized: true,
        pokemon,
      };

      service.save(state);
      const loaded = service.load();

      expect(loaded?.state.evolutionProgress.requirements[0]?.value).toBe(99);
    });
  });

  describe('Edge Cases', () => {
    it('должен мигрировать v5 состояние без timestamp-полей care и train', () => {
      const state = createInitialTamagotchiState();
      const { lastCareTime, lastTrainTime, ...legacyStatus } = state.status;
      const legacyState = {
        ...state,
        status: legacyStatus,
        trainingExperienceReward: 25,
        trainingStartedAt: 1_700_000_000_000,
      } as unknown as TamagotchiStateModel;

      void lastCareTime;
      void lastTrainTime;

      storageMock.setItem(
        TAMAGOTCHI_STORAGE_KEY,
        JSON.stringify({ state: legacyState, version: 5 }),
      );

      const loaded = service.load();

      expect(loaded?.state.status.lastCareTime).toBeNull();
      expect(loaded?.state.status.lastTrainTime).toBeNull();
      expect(loaded?.state.trainingExperienceReward).toBe(25);
      expect(loaded?.state.trainingStartedAt).toBe(1_700_000_000_000);
    });

    it('должен мигрировать legacy notification strings в явный text-контракт', () => {
      const legacyState = {
        ...createInitialTamagotchiState(),
        notificationList: [
          {
            id: 'notification-1',
            message: 'Mr. Mime',
            priority: 'achievement',
            read: false,
            timestamp: 1_700_000_000_000,
            title: 'evolution.readyTitle',
          },
        ],
      } as unknown as TamagotchiStateModel;

      storageMock.setItem(
        TAMAGOTCHI_STORAGE_KEY,
        JSON.stringify({ state: legacyState, version: 6 }),
      );

      const loaded = service.load();

      expect(loaded?.state.notificationList[0]).toEqual(
        expect.objectContaining({
          message: { kind: 'plainText', text: 'Mr. Mime' },
          title: { key: 'evolution.readyTitle', kind: 'translationKey' },
        }),
      );
    });

    it('должен мигрировать interactionHistory в interactionHistoryList и убрать legacy-ключ', () => {
      const interaction = {
        intensity: 1,
        moodIncrease: 5,
        timestamp: 1_700_000_000_000,
        type: 'pet' as const,
      };
      const legacyState = {
        ...createInitialTamagotchiState(),
        interactionHistory: [interaction],
      };

      delete (legacyState as Partial<TamagotchiStateModel>).interactionHistoryList;

      storageMock.setItem(
        TAMAGOTCHI_STORAGE_KEY,
        JSON.stringify({ state: legacyState, version: 8 }),
      );

      const loaded = service.load();

      expect(loaded?.state.interactionHistoryList).toEqual([interaction]);
      expect(
        (loaded?.state as TamagotchiStateModel & { interactionHistory?: unknown })
          .interactionHistory,
      ).toBeUndefined();
    });

    it('должен восстанавливаться из backup при повреждённом основном хранилище', () => {
      const state = createInitialTamagotchiState();
      const payload = JSON.stringify({ state, version: TAMAGOTCHI_STATE_VERSION });

      storageMock.setItem(TAMAGOTCHI_BACKUP_KEY, payload);
      storageMock.setItem(TAMAGOTCHI_STORAGE_KEY, '{ invalid json');

      const loaded = service.load();

      expect(loaded?.recoveredFromBackup).toBe(true);
      expect(loaded?.state.status.health).toBe(state.status.health);
    });

    it('должен очищать сохранённое состояние', () => {
      service.save(createInitialTamagotchiState());
      service.clear();

      expect(storageMock.getItem(TAMAGOTCHI_STORAGE_KEY)).toBeNull();
      expect(storageMock.getItem(TAMAGOTCHI_BACKUP_KEY)).toBeNull();
      expect(service.load()).toBeNull();
    });
  });
});
