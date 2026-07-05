import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
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
import { snapshotState, TamagotchiStore } from '../store/tamagotchi.store';
import { TamagotchiNotificationService } from '../../ui/services/notification.service';
import { PERFORMANCE_PROFILES } from '../constants/performance-mode.constants';
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
    isTraining?: boolean;
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
    isSleeping: signal(false),
    isTraining: signal(overrides.isTraining ?? false),
    lastActionTime: signal(initial.lastActionTime),
    lastDecayTime: signal(initial.lastDecayTime),
    lastSaveTime: signal(initial.lastSaveTime),
    notificationList: signal(initial.notificationList),
    pokemon: signal(overrides.pokemon ?? TEST_POKEMON),
    status: signal(createInitialPokemonStatus()),
    trainingExperienceReward: signal<number | null>(null),
    trainingStartedAt: signal<number | null>(null),
  };

  return {
    ...storeSignals,
    snapshot: computed(() => snapshotState(storeSignals)),
    ...methods,
  };
}

describe('TamagotchiFacade', () => {
  let mockStore: ReturnType<typeof createStoreMock>;
  let mockInitService: MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;
  let facade: TamagotchiFacade;

  beforeEach(() => {
    mockStore = createStoreMock();
    mockInitService = {
      bootstrapFromProfile: vi.fn(() => of(undefined)),
    } as const satisfies MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;

    const mockNotificationService = {
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

    const mockPerformanceMethods = {
      getProfile: vi.fn(() => PERFORMANCE_PROFILES.balanced),
      setMode: vi.fn(),
    } as const satisfies MockedObject<Pick<PerformanceService, 'getProfile' | 'setMode'>>;

    const mockPerformanceService = {
      ...mockPerformanceMethods,
      mode: signal('balanced' as const),
    };

    const mockTimerService = {
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
              getProfile: vi.fn(() => PERFORMANCE_PROFILES.balanced),
              mode: signal('balanced' as const),
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
