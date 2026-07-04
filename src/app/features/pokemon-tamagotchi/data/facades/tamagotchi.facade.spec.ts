import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
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
    startEvolution: vi.fn(),
    startTraining: vi.fn(),
    updateStatus: vi.fn(),
    wakeUp: vi.fn(),
    water: vi.fn(),
  } as const satisfies TamagotchiStoreMethodsMock;

  return {
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
      resolveEffectiveMode: vi.fn(() => 'balanced' as const),
      setMode: vi.fn(),
    } as const satisfies MockedObject<
      Pick<PerformanceService, 'getProfile' | 'resolveEffectiveMode' | 'setMode'>
    >;

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
