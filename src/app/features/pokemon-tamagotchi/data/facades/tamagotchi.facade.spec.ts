import { computed, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { EvolutionService } from '../services/evolution.service';
import { PerformanceService } from '../services/performance.service';
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
import { PERFORMANCE_PROFILES } from '../constants/performance-mode.constants';
import { TIMER_CONFIG } from '../constants/timer.constants';
import type { PerformanceMode } from '../models/performance-mode.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import { TamagotchiFacade } from './tamagotchi.facade';

type TamagotchiStoreInstance = InstanceType<typeof TamagotchiStore>;

type TamagotchiStoreMethodsMock = MockedObject<
  Pick<
    TamagotchiStoreInstance,
    | 'applyStatusDecay'
    | 'care'
    | 'checkEvolution'
    | 'clearError'
    | 'completeEvolution'
    | 'completeTraining'
    | 'feed'
    | 'interactWithPokemon'
    | 'markEvolutionReadyNotified'
    | 'play'
    | 'putToSleep'
    | 'resetState'
    | 'restartTrainingTimer'
    | 'startEvolution'
    | 'startTraining'
    | 'updateStatus'
    | 'wakeUp'
    | 'water'
  >
>;

function createStoreMock(
  overrides: {
    error?: string | null;
    initialized?: boolean;
    pokemon?: typeof TEST_POKEMON | null;
    isSleeping?: boolean;
    isTraining?: boolean;
    status?: PokemonStatusModel;
  } = {},
) {
  const initial = createInitialTamagotchiState();

  const methods = {
    applyStatusDecay: vi.fn(),
    care: vi.fn(),
    checkEvolution: vi.fn(),
    clearError: vi.fn(),
    completeEvolution: vi.fn(),
    completeTraining: vi.fn(),
    feed: vi.fn(),
    interactWithPokemon: vi.fn(),
    markEvolutionReadyNotified: vi.fn(),
    play: vi.fn(),
    putToSleep: vi.fn(),
    resetState: vi.fn(),
    restartTrainingTimer: vi.fn(),
    startEvolution: vi.fn(),
    startTraining: vi.fn(),
    updateStatus: vi.fn(),
    wakeUp: vi.fn(),
    water: vi.fn(),
  } as const satisfies TamagotchiStoreMethodsMock;

  const storeSignals = {
    achievementList: signal(initial.achievementList),
    canEvolve: signal(false),
    dailyRoutine: signal(initial.dailyRoutine),
    error: signal(overrides.error ?? initial.error),
    evolutionProgress: signal(initial.evolutionProgress),
    hasPokemon: signal((overrides.pokemon ?? TEST_POKEMON) !== null),
    initialized: signal(overrides.initialized ?? true),
    interactionHistory: signal(initial.interactionHistory),
    isEvolving: signal(false),
    isSleeping: signal(overrides.isSleeping ?? false),
    isTraining: signal(overrides.isTraining ?? false),
    lastActionTime: signal(initial.lastActionTime),
    lastDecayTime: signal(initial.lastDecayTime),
    lastSaveTime: signal(initial.lastSaveTime),
    notificationList: signal(initial.notificationList),
    pokemon: signal(overrides.pokemon ?? TEST_POKEMON),
    status: signal(overrides.status ?? createInitialPokemonStatus()),
    trainingExperienceReward: signal<number | null>(null),
    trainingStartedAt: signal<number | null>(null),
  };

  return {
    ...storeSignals,
    ...methods,
  };
}

describe('TamagotchiFacade', () => {
  let mockStore: ReturnType<typeof createStoreMock>;
  let mockInitService: MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;
  let mockNotificationService: MockedObject<
    Pick<TamagotchiNotificationService, 'notifyEvolutionReady' | 'processStatusAlerts'>
  >;
  let mockPerformanceMode: WritableSignal<PerformanceMode>;
  let mockTimerService: MockedObject<Pick<TimerService, 'startTimer' | 'stopTimer'>>;
  let facade: TamagotchiFacade;

  beforeEach(() => {
    mockStore = createStoreMock();
    mockInitService = {
      bootstrapFromProfile: vi.fn(() => of(undefined)),
    } as const satisfies MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;

    mockNotificationService = {
      notifyEvolutionReady: vi.fn(),
      processStatusAlerts: vi.fn(),
    } as const satisfies MockedObject<
      Pick<TamagotchiNotificationService, 'notifyEvolutionReady' | 'processStatusAlerts'>
    >;

    const mockEvolutionService = {
      buildEvolutionData: vi.fn(),
      triggerEvolution: vi.fn(),
    } as const satisfies MockedObject<
      Pick<EvolutionService, 'buildEvolutionData' | 'triggerEvolution'>
    >;

    mockPerformanceMode = signal<PerformanceMode>('balanced');
    const mockPerformanceMethods = {
      setMode: vi.fn(),
    } as const satisfies MockedObject<Pick<PerformanceService, 'setMode'>>;

    const mockPerformanceService = {
      ...mockPerformanceMethods,
      mode: mockPerformanceMode.asReadonly(),
      profile: computed(() => PERFORMANCE_PROFILES[mockPerformanceMode()]),
    };

    mockTimerService = {
      startTimer: vi.fn(() => ({ cleanup: vi.fn() })),
      stopTimer: vi.fn(),
    } as const satisfies MockedObject<Pick<TimerService, 'startTimer' | 'stopTimer'>>;

    TestBed.configureTestingModule({
      providers: [
        TamagotchiFacade,
        { provide: TamagotchiStore, useValue: mockStore },
        { provide: TamagotchiInitService, useValue: mockInitService },
        { provide: TamagotchiNotificationService, useValue: mockNotificationService },
        { provide: EvolutionService, useValue: mockEvolutionService },
        { provide: PerformanceService, useValue: mockPerformanceService },
        { provide: TimerService, useValue: mockTimerService },
        TamagotchiService,
      ],
    });

    facade = TestBed.inject(TamagotchiFacade);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен создаваться без автоматической загрузки профиля', () => {
        expect(facade).toBeDefined();
        expect(mockInitService.bootstrapFromProfile).not.toHaveBeenCalled();
      });

      it('должен загружать состояние из профиля по команде страницы', () => {
        facade.bootstrapFromProfile();

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

      it('должен блокировать действия кроме play во время тренировки', () => {
        mockStore.isTraining.set(true);
        facade.onAction('feed');

        expect(mockStore.feed).not.toHaveBeenCalled();
      });

      it('должен перезапускать таймер тренировки при play во время тренировки', () => {
        mockStore.isTraining.set(true);
        facade.onAction('play');

        expect(mockStore.play).toHaveBeenCalledTimes(1);
        expect(mockStore.restartTrainingTimer).toHaveBeenCalledTimes(1);
        expect(mockStore.checkEvolution).toHaveBeenCalledTimes(1);
      });

      it('должен применять бонус энергии при пробуждении после полноценного сна', () => {
        mockStore.isSleeping.set(true);
        mockStore.status.set({
          ...createInitialPokemonStatus(),
          lastSleepTime: Date.now() - TIMER_CONFIG.SLEEP.MIN_DURATION_MS - 1_000,
        });

        facade.onAction('sleep');

        expect(mockStore.wakeUp).toHaveBeenNthCalledWith(
          1,
          expect.any(Number),
          TIMER_CONFIG.SLEEP.BONUS_ENERGY,
        );
        expect(mockStore.checkEvolution).toHaveBeenCalledTimes(1);
      });

      it('должен обрабатывать взаимодействие с покемоном во время тренировки', () => {
        mockStore.isTraining.set(true);
        facade.onInteraction({
          intensity: 1,
          moodIncrease: 5,
          timestamp: Date.now(),
          type: 'click',
        });

        expect(mockStore.interactWithPokemon).toHaveBeenCalledTimes(1);
        expect(mockStore.restartTrainingTimer).not.toHaveBeenCalled();
      });

      it('должен разблокировать действие через активный cooldown ticker', () => {
        vi.useFakeTimers();

        const startedAt = Date.now();

        mockStore.status.set({
          ...createInitialPokemonStatus(),
          lastFeedTime: startedAt,
        });
        TestBed.flushEffects();

        expect(facade.canFeed()).toBe(false);

        vi.advanceTimersByTime(GAME_BALANCE.ACTION_EFFECTS.FEED.cooldown + 1_000);
        TestBed.flushEffects();

        expect(facade.canFeed()).toBe(true);
      });
    });

    describe('Performance mode', () => {
      it('должен перезапускать таймер при смене профиля производительности', () => {
        TestBed.flushEffects();

        const firstHandle = mockTimerService.startTimer.mock.results[0]?.value;

        mockPerformanceMode.set('low');
        TestBed.flushEffects();

        expect(mockTimerService.stopTimer).toHaveBeenNthCalledWith(1, firstHandle);
        expect(mockTimerService.startTimer).toHaveBeenCalledTimes(2);
        expect(mockTimerService.startTimer.mock.calls[1]?.[2]).toEqual({
          intervalMs: PERFORMANCE_PROFILES.low.decayIntervalMs,
          pauseWhenHidden: true,
        });
      });
    });

    describe('Сброс прогресса', () => {
      it('должен сбрасывать состояние и перезагружать профиль', () => {
        facade.onResetProgress();

        expect(mockStore.resetState).toHaveBeenCalledTimes(1);
        expect(mockStore.clearError).toHaveBeenCalledTimes(1);
        expect(mockInitService.bootstrapFromProfile).toHaveBeenCalledTimes(1);
      });
    });

    describe('Уведомление об эволюции', () => {
      it('должен помечать готовность к эволюции после первого уведомления', () => {
        mockStore.evolutionProgress.set({
          ...mockStore.evolutionProgress(),
          isReady: true,
          readyNotifiedAt: null,
        });
        mockStore.canEvolve.set(true);

        TestBed.flushEffects();

        expect(mockNotificationService.notifyEvolutionReady).toHaveBeenCalledTimes(1);
        expect(mockStore.markEvolutionReadyNotified).toHaveBeenCalledTimes(1);
        expect(mockStore.startEvolution).toHaveBeenCalledTimes(1);
      });

      it('не должен повторять уведомление после восстановления уже помеченного ready-state', () => {
        mockStore.evolutionProgress.set({
          ...mockStore.evolutionProgress(),
          isReady: true,
          readyNotifiedAt: 1_700_000_000_000,
        });
        mockStore.canEvolve.set(true);

        TestBed.flushEffects();

        expect(mockNotificationService.notifyEvolutionReady).not.toHaveBeenCalled();
        expect(mockStore.markEvolutionReadyNotified).not.toHaveBeenCalled();
        expect(mockStore.startEvolution).not.toHaveBeenCalled();
      });
    });
  });

  describe('Подписки', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('не должен обрабатывать поздний emit bootstrap после уничтожения фасада', () => {
      vi.useFakeTimers();

      let bootstrapCallCount = 0;
      const lateBootstrapEffect = vi.fn();

      mockInitService.bootstrapFromProfile = vi.fn(() => {
        bootstrapCallCount++;

        if (bootstrapCallCount === 1) {
          return of(undefined);
        }

        return new Observable<void>((subscriber) => {
          const timeoutId = setTimeout(() => {
            lateBootstrapEffect();
            subscriber.next();
            subscriber.complete();
          }, 100);

          return () => {
            clearTimeout(timeoutId);
          };
        });
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          TamagotchiFacade,
          { provide: TamagotchiStore, useValue: mockStore },
          { provide: TamagotchiInitService, useValue: mockInitService },
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
          {
            provide: PerformanceService,
            useValue: {
              mode: signal<PerformanceMode>('balanced').asReadonly(),
              profile: computed(() => PERFORMANCE_PROFILES.balanced),
              setMode: vi.fn(),
            },
          },
          {
            provide: TimerService,
            useValue: {
              startTimer: vi.fn(() => ({ cleanup: vi.fn() })),
              stopTimer: vi.fn(),
            },
          },
          TamagotchiService,
        ],
      });

      const resetFacade = TestBed.inject(TamagotchiFacade);

      resetFacade.onResetProgress();
      TestBed.resetTestingModule();
      vi.advanceTimersByTime(200);

      expect(lateBootstrapEffect).not.toHaveBeenCalled();
    });
  });
});
