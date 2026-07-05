import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { TamagotchiSelectionService } from '../../../data/services/tamagotchi-selection.service';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { TEST_POKEMON } from '../../../data/fixtures/tamagotchi-arbitraries';
import {
  createInitialPokemonStatus,
  createInitialTamagotchiState,
} from '../../../data/store/tamagotchi-initial';
import { snapshotState, TamagotchiStore } from '../../../data/store/tamagotchi.store';
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
  } as const satisfies TamagotchiStorePageMethodsMock;

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
    isTraining: signal(false),
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

describe('PokemonTamagotchiPageComponent', () => {
  describe('Happy Path', () => {
    let fixture: ComponentFixture<PokemonTamagotchiPageComponent>;

    beforeEach(async () => {
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
          { provide: TamagotchiStore, useValue: createStoreMock() },
          { provide: TamagotchiInitService, useValue: createInitPageMock() },
          { provide: TamagotchiSelectionService, useValue: createSelectionPageMock() },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
      fixture.detectChanges();
    });

    it('должен создаваться', () => {
      expect(fixture.componentInstance).toBeTruthy();
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
});
