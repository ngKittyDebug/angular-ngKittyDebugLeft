import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { TamagotchiSelectionService } from '../../../data/services/tamagotchi-selection.service';
import { EvolutionService } from '../../../data/services/evolution.service';
import { PerformanceService } from '../../../data/services/performance.service';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { TamagotchiService } from '../../../data/services/tamagotchi.service';
import { TimerService } from '../../../data/services/timer.service';
import { TEST_POKEMON } from '../../../data/fixtures/tamagotchi-arbitraries';
import {
  createInitialPokemonStatus,
  createInitialTamagotchiState,
} from '../../../data/store/tamagotchi-initial';
import { TamagotchiStore } from '../../../data/store/tamagotchi.store';
import { TamagotchiFacade } from '../../../data/facades/tamagotchi.facade';
import { AnimationService } from '../../services/animation.service';
import { TamagotchiNotificationService } from '../../services/notification.service';
import { PokemonTamagotchiPageComponent } from './pokemon-tamagotchi-page.component';

type TamagotchiStoreInstance = InstanceType<typeof TamagotchiStore>;

type TamagotchiStorePageMethodsMock = MockedObject<
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

type TamagotchiInitPageMock = MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;

type TamagotchiSelectionPageMock = MockedObject<
  Pick<
    TamagotchiSelectionService,
    'loadPokemonByName' | 'saveSelectedPokemon' | 'validateSelectedPokemon'
  >
>;

function createInitPageMock(): TamagotchiInitPageMock {
  return {
    bootstrapFromProfile: vi.fn(() => of(undefined)),
  } as const satisfies TamagotchiInitPageMock;
}

function createSelectionPageMock(): TamagotchiSelectionPageMock {
  return {
    loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
    saveSelectedPokemon: vi.fn(),
    validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection' as const, valid: false })),
  } as const satisfies TamagotchiSelectionPageMock;
}

const PAGE_TRANSLATIONS = {
  ariaLabel: 'Tamagotchi',
  evolvedPokemonError: 'Evolved',
  goToProfile: 'Open profile',
  levelBadge: 'Lv. {{level}}',
  loadFailedError: 'Load failed',
  loading: 'Loading…',
  noSelectionHint: 'Choose a Pokémon',
  noSelectionTitle: 'No Pokémon selected',
  saveFailedError: 'Save failed',
  stateLoadFailedError: 'State load failed',
  evolutionPrepareFailedError: 'Evolution prepare failed',
  stateRecoveredWarning: 'Recovered',
  statusPanelAria: 'Status panel',
  dismissNotice: 'Dismiss',
  resetProgress: 'Reset',
  performanceLabel: 'Performance',
  performanceAria: 'Performance mode',
  performanceModes: {
    balanced: 'Balanced',
    high: 'High',
    low: 'Low power',
  },
  title: 'Pokémon Tamagotchi',
};

function createStoreMock(
  overrides: {
    error?: string | null;
    initialized?: boolean;
    pokemon?: typeof TEST_POKEMON | null;
  } = {},
) {
  const initial = createInitialTamagotchiState();
  const pokemon = overrides.pokemon === undefined ? TEST_POKEMON : overrides.pokemon;

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
  } as const satisfies TamagotchiStorePageMethodsMock;

  const storeSignals = {
    achievementList: signal(initial.achievementList),
    canEvolve: signal(false),
    dailyRoutine: signal(initial.dailyRoutine),
    error: signal(overrides.error ?? initial.error),
    evolutionProgress: signal(initial.evolutionProgress),
    hasPokemon: signal(pokemon !== null),
    initialized: signal(overrides.initialized ?? true),
    interactionHistory: signal(initial.interactionHistory),
    isEvolving: signal(false),
    isSleeping: signal(false),
    isTraining: signal(false),
    lastActionTime: signal(initial.lastActionTime),
    lastDecayTime: signal(initial.lastDecayTime),
    lastSaveTime: signal(initial.lastSaveTime),
    notificationList: signal(initial.notificationList),
    pokemon: signal(pokemon),
    status: signal(createInitialPokemonStatus()),
    trainingExperienceReward: signal<number | null>(null),
    trainingStartedAt: signal<number | null>(null),
  };

  return {
    ...storeSignals,
    ...methods,
  };
}

function createFacadeProviders() {
  return [
    TamagotchiFacade,
    TamagotchiService,
    AnimationService,
    {
      provide: EvolutionService,
      useValue: {
        buildEvolutionData: vi.fn(() => null),
        prepareEvolution: vi.fn(() => of(null)),
      },
    },
    {
      provide: PerformanceService,
      useValue: {
        mode: signal('balanced' as const).asReadonly(),
        profile: computed(() => ({ decayIntervalMs: 30_000 })),
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
    {
      provide: TamagotchiNotificationService,
      useValue: {
        notifyEvolutionReady: vi.fn(),
        processStatusAlerts: vi.fn(),
      },
    },
  ];
}

describe('PokemonTamagotchiPageComponent', () => {
  describe('Happy Path', () => {
    let fixture: ComponentFixture<PokemonTamagotchiPageComponent>;
    let initService: TamagotchiInitPageMock;

    beforeEach(async () => {
      initService = createInitPageMock();

      await TestBed.configureTestingModule({
        imports: [
          PokemonTamagotchiPageComponent,
          TranslocoTestingModule.forRoot({
            langs: {
              en: {
                pokemonTamagotchi: {
                  actions: {
                    care: 'Care',
                    cooldown: '{{seconds}}s',
                    disabledCooldown: 'Cooldown',
                    disabledLowEnergy: 'Low energy',
                    feed: 'Feed',
                    play: 'Play',
                    sleep: 'Sleep',
                    train: 'Train',
                    wakeUp: 'Wake up',
                    water: 'Water',
                  },
                  evolution: {
                    evolving: 'Evolving…',
                    evolvingAria: '{{name}} is evolving',
                  },
                  page: PAGE_TRANSLATIONS,
                  status: {
                    energy: 'Energy',
                    experience: 'Experience',
                    health: 'Health',
                    hunger: 'Hunger',
                    hydration: 'Hydration',
                    levelTooltip: 'Level {{level}}',
                    mood: 'Mood',
                    tooltip: '{{label}}: {{value}} / {{max}}',
                  },
                },
              },
            },
            translocoConfig: {
              availableLangs: ['en'],
              defaultLang: 'en',
            },
          }),
        ],
        providers: [
          provideRouter([]),
          ...createFacadeProviders(),
          { provide: TamagotchiStore, useValue: createStoreMock() },
          { provide: TamagotchiInitService, useValue: initService },
          { provide: TamagotchiSelectionService, useValue: createSelectionPageMock() },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
      fixture.detectChanges();
    });

    it('должен создаваться', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('должен синхронизировать store с выбранным покемоном при создании страницы', () => {
      expect(initService.bootstrapFromProfile).toHaveBeenCalledTimes(1);
    });

    it('должен повторно синхронизировать store при новом создании страницы с тем же facade', () => {
      fixture.destroy();

      const nextFixture = TestBed.createComponent(PokemonTamagotchiPageComponent);

      nextFixture.detectChanges();

      expect(initService.bootstrapFromProfile).toHaveBeenCalledTimes(2);

      nextFixture.destroy();
    });

    it('должен отображать заголовок страницы', () => {
      const title = fixture.nativeElement.querySelector('.tamagotchi-page__title');

      expect(title?.textContent?.trim()).toBe('Pokémon Tamagotchi');
    });

    it('должен отображать индикаторы статуса, когда покемон загружен', () => {
      const indicators = fixture.nativeElement.querySelectorAll('left-paw-status-indicator');
      const labels = fixture.nativeElement.querySelectorAll(
        '.status-indicator__label',
      ) as NodeListOf<Element>;
      const bars = fixture.nativeElement.querySelectorAll('progress[tuiProgressBar]');

      expect(indicators.length).toBe(6);
      expect(labels.length).toBe(6);
      expect(bars.length).toBe(6);
      const labelTexts = [...labels].map((node) => node.textContent?.trim() ?? '');

      expect(labelTexts).toEqual(
        expect.arrayContaining(['Health', 'Hunger', 'Hydration', 'Mood', 'Energy', 'Experience']),
      );
    });

    it('должен отображать панель уведомлений', () => {
      const notificationList = fixture.nativeElement.querySelector(
        'left-paw-tamagotchi-notifications',
      );

      expect(notificationList).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    let fixture: ComponentFixture<PokemonTamagotchiPageComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          PokemonTamagotchiPageComponent,
          TranslocoTestingModule.forRoot({
            langs: {
              en: {
                pokemonTamagotchi: {
                  page: PAGE_TRANSLATIONS,
                },
              },
            },
            translocoConfig: {
              availableLangs: ['en'],
              defaultLang: 'en',
            },
          }),
        ],
        providers: [
          provideRouter([]),
          ...createFacadeProviders(),
          {
            provide: TamagotchiStore,
            useValue: createStoreMock({ initialized: false, pokemon: null }),
          },
          { provide: TamagotchiInitService, useValue: createInitPageMock() },
          { provide: TamagotchiSelectionService, useValue: createSelectionPageMock() },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
      fixture.detectChanges();
    });

    it('должен показывать состояние загрузки, пока store не инициализирован', () => {
      const loading = fixture.nativeElement.querySelector('.tamagotchi-page__loading');

      expect(loading).toBeTruthy();
      expect(loading?.textContent).toContain('Loading…');
    });
  });

  describe('Negative Cases', () => {
    let fixture: ComponentFixture<PokemonTamagotchiPageComponent>;
    let storeMock: ReturnType<typeof createStoreMock>;

    beforeEach(async () => {
      storeMock = createStoreMock({
        error: 'noSelection',
        initialized: true,
        pokemon: null,
      });

      await TestBed.configureTestingModule({
        imports: [
          PokemonTamagotchiPageComponent,
          TranslocoTestingModule.forRoot({
            langs: {
              en: {
                pokemonTamagotchi: {
                  page: PAGE_TRANSLATIONS,
                },
              },
            },
            translocoConfig: {
              availableLangs: ['en'],
              defaultLang: 'en',
            },
          }),
        ],
        providers: [
          provideRouter([]),
          ...createFacadeProviders(),
          {
            provide: TamagotchiStore,
            useValue: storeMock,
          },
          { provide: TamagotchiInitService, useValue: createInitPageMock() },
          { provide: TamagotchiSelectionService, useValue: createSelectionPageMock() },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
      fixture.detectChanges();
    });

    it('должен показывать пустое состояние, когда покемон не выбран', () => {
      const title = fixture.nativeElement.querySelector('.tamagotchi-page__empty-title');
      const hint = fixture.nativeElement.querySelector('.tamagotchi-page__empty-hint');
      const link = fixture.nativeElement.querySelector('a[routerLink="/profile"]');

      expect(title?.textContent?.trim()).toBe('No Pokémon selected');
      expect(hint?.textContent?.trim()).toBe('Choose a Pokémon');
      expect(link?.textContent?.trim()).toBe('Open profile');
    });

    it('должен показывать ошибку эволюционировавшего покемона', () => {
      storeMock.error.set('evolvedPokemon');
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.tamagotchi-page__error');

      expect(error?.textContent?.trim()).toBe('Evolved');
    });

    it('должен показывать ошибку загрузки выбранного покемона', () => {
      storeMock.error.set('loadFailed');
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.tamagotchi-page__error');

      expect(error?.textContent?.trim()).toBe('Load failed');
    });
  });
});
