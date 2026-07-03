import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvolutionService } from '../services/evolution.service';
import { MemoryManagementService } from '../services/memory-management.service';
import { PerformanceService } from '../services/performance.service';
import { TamagotchiAnalyticsService } from '../services/tamagotchi-analytics.service';
import { TamagotchiInitService } from '../services/tamagotchi-init.service';
import { TamagotchiService } from '../services/tamagotchi.service';
import { TimerService } from '../services/timer.service';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import {
  createInitialPokemonStatus,
  createInitialTamagotchiState,
} from '../store/tamagotchi-initial';
import { TamagotchiStore } from '../store/tamagotchi.store';
import { TamagotchiNotificationService } from '../../ui/services/notification.service';
import { TamagotchiFacade } from './tamagotchi.facade';

function createStoreMock(
  overrides: {
    error?: string | null;
    initialized?: boolean;
    pokemon?: typeof TEST_POKEMON | null;
    isTraining?: boolean;
  } = {},
) {
  const initial = createInitialTamagotchiState();

  return {
    achievementList: signal(initial.achievementList),
    applyStatusDecay: vi.fn(),
    canEvolve: signal(false),
    care: vi.fn(),
    checkEvolution: vi.fn(),
    clearError: vi.fn(),
    completeEvolution: vi.fn(),
    completeTraining: vi.fn(),
    dailyRoutine: signal(initial.dailyRoutine),
    error: signal(overrides.error ?? initial.error),
    evolutionProgress: signal(initial.evolutionProgress),
    feed: vi.fn(),
    hasPokemon: signal((overrides.pokemon ?? TEST_POKEMON) !== null),
    initialized: signal(overrides.initialized ?? true),
    interactionHistory: signal(initial.interactionHistory),
    interactWithPokemon: vi.fn(),
    isEvolving: signal(false),
    isSleeping: signal(false),
    isTraining: signal(overrides.isTraining ?? false),
    lastActionTime: signal(initial.lastActionTime),
    lastDecayTime: signal(initial.lastDecayTime),
    lastSaveTime: signal(initial.lastSaveTime),
    notificationList: signal(initial.notificationList),
    play: vi.fn(),
    pokemon: signal(overrides.pokemon ?? TEST_POKEMON),
    putToSleep: vi.fn(),
    resetState: vi.fn(),
    startEvolution: vi.fn(),
    startTraining: vi.fn(),
    status: signal(createInitialPokemonStatus()),
    trainingExperienceReward: signal<number | null>(null),
    trainingStartedAt: signal<number | null>(null),
    updateStatus: vi.fn(),
    wakeUp: vi.fn(),
    water: vi.fn(),
  };
}

describe('TamagotchiFacade', () => {
  let mockStore: ReturnType<typeof createStoreMock>;
  let mockInitService: { bootstrapFromProfile: ReturnType<typeof vi.fn> };
  let facade: TamagotchiFacade;

  beforeEach(() => {
    mockStore = createStoreMock();
    mockInitService = {
      bootstrapFromProfile: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        TamagotchiFacade,
        { provide: TamagotchiStore, useValue: mockStore },
        { provide: TamagotchiInitService, useValue: mockInitService },
        { provide: TamagotchiAnalyticsService, useValue: { track: vi.fn() } },
        {
          provide: TamagotchiNotificationService,
          useValue: {
            notifyEvolutionReady: vi.fn(),
            processStatusAlerts: vi.fn(),
          },
        },
        {
          provide: EvolutionService,
          useValue: {
            buildEvolutionData: vi.fn(),
            triggerEvolution: vi.fn(),
          },
        },
        { provide: MemoryManagementService, useValue: { runGarbageCollection: vi.fn() } },
        {
          provide: PerformanceService,
          useValue: {
            getProfile: vi.fn(() => ({ decayIntervalMs: 15_000 })),
            mode: signal('balanced' as const),
            resolveEffectiveMode: vi.fn(() => 'balanced' as const),
            setMode: vi.fn(),
          },
        },
        {
          provide: TimerService,
          useValue: {
            startTimer: vi.fn(() => 1),
            stopTimer: vi.fn(),
          },
        },
        TamagotchiService,
      ],
    });

    facade = TestBed.inject(TamagotchiFacade);
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен создаваться и загружать состояние из профиля', () => {
        expect(facade).toBeDefined();
        expect(mockInitService.bootstrapFromProfile).toHaveBeenCalledTimes(1);
      });

      it('должен экспортировать pokemon из store', () => {
        expect(facade.pokemon()?.name).toBe(TEST_POKEMON.name);
      });
    });

    describe('Действия', () => {
      it('должен вызывать store.feed при onAction feed', () => {
        facade.onAction('feed');

        expect(mockStore.feed).toHaveBeenCalledTimes(1);
        expect(mockStore.checkEvolution).toHaveBeenCalledTimes(1);
      });

      it('должен блокировать действия во время тренировки', () => {
        mockStore.isTraining.set(true);
        facade.onAction('feed');

        expect(mockStore.feed).not.toHaveBeenCalled();
      });
    });

    describe('Сброс прогресса', () => {
      it('должен сбрасывать состояние и перезагружать профиль', () => {
        facade.onResetProgress();

        expect(mockStore.resetState).toHaveBeenCalledTimes(1);
        expect(mockStore.clearError).toHaveBeenCalledTimes(1);
        expect(mockInitService.bootstrapFromProfile).toHaveBeenCalledTimes(2);
      });
    });
  });
});
