import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';

// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import enTranslations from '../../../../public/i18n/pokemonTamagotchi/en.json';
// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import ruTranslations from '../../../../public/i18n/pokemonTamagotchi/ru.json';
import { ChildrenRouts } from '../features.routes';
import { GAMES_PATH } from '../games/games.routes';
import { feedPokemonState, selectPokemonState } from './data/store/tamagotchi-state-transitions';
import { createInitialTamagotchiState } from './data/store/tamagotchi-initial';
import { TamagotchiStore } from './data/store/tamagotchi.store';
import { TamagotchiFacade } from './data/facades/tamagotchi.facade';
import { EvolutionService } from './data/services/evolution.service';
import { PerformanceService } from './data/services/performance.service';
import { TamagotchiInitService } from './data/services/tamagotchi-init.service';
import { TamagotchiPersistenceService } from './data/services/tamagotchi-persistence.service';
import { TamagotchiSelectionService } from './data/services/tamagotchi-selection.service';
import { TamagotchiService } from './data/services/tamagotchi.service';
import { TimerService } from './data/services/timer.service';
import { TEST_POKEMON } from './data/fixtures/tamagotchi-arbitraries';
import { pokemonTamagotchiRoutes, TAMAGOTCHI_PATH } from './pokemon-tamagotchi.routes';
import { PokemonTamagotchiPageComponent } from './ui/components/pokemon-tamagotchi-page/pokemon-tamagotchi-page.component';
import { AnimationService } from './ui/services/animation.service';
import { TamagotchiNotificationService } from './data/services/tamagotchi-notification.service';

type TamagotchiStoreInstance = InstanceType<typeof TamagotchiStore>;

type TamagotchiStoreSmokeMethodsMock = MockedObject<
  Pick<
    TamagotchiStoreInstance,
    'checkEvolution' | 'clearError' | 'loadFromPersistence' | 'selectPokemon' | 'setError'
  >
>;

type TamagotchiInitSmokeMock = MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;

type TamagotchiSelectionSmokeMock = MockedObject<
  Pick<TamagotchiSelectionService, 'saveSelectedPokemon' | 'validateSelectedPokemon'>
>;

function createInitSmokeMock(): TamagotchiInitSmokeMock {
  return {
    bootstrapFromProfile: vi.fn(() => of(undefined)),
  } as const satisfies TamagotchiInitSmokeMock;
}

function createFacadeSmokeProviders() {
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

const REQUIRED_TRANSLATION_PATHS = [
  'page.title',
  'page.noSelectionTitle',
  'page.goToProfile',
  'actions.feed',
  'actions.play',
  'actions.train',
  'actions.sleep',
  'status.health',
  'status.hunger',
  'notifications.empty',
] as const;

function readTranslationPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

describe('PokemonTamagotchi — смоук', () => {
  describe('Конфигурация роута', () => {
    it('должен регистрировать lazy-роут по пути /tamagotchi', () => {
      const route = pokemonTamagotchiRoutes.find((entry) => entry.path === TAMAGOTCHI_PATH);

      expect(route).toBeDefined();
      expect(route?.loadComponent).toBeTypeOf('function');
      expect(route?.providers?.length).toBeGreaterThan(0);
    });

    it('должен lazy-загружать PokemonTamagotchiPageComponent', async () => {
      const route = pokemonTamagotchiRoutes.find((entry) => entry.path === TAMAGOTCHI_PATH);
      const loaded = await route?.loadComponent?.();

      expect(loaded).toBe(PokemonTamagotchiPageComponent);
    });

    it('должен быть подключён дочерним роутом раздела games', () => {
      const gamesRoute = ChildrenRouts.find((entry) => entry.path === GAMES_PATH);

      const registered = gamesRoute?.children?.some((entry) => entry.path === TAMAGOTCHI_PATH);

      expect(registered).toBe(true);
    });
  });

  describe('Переводы', () => {
    it('должен содержать непустые файлы локалей en и ru', () => {
      expect(Object.keys(enTranslations).length).toBeGreaterThan(0);
      expect(Object.keys(ruTranslations).length).toBeGreaterThan(0);
    });

    it.each(REQUIRED_TRANSLATION_PATHS)(
      'должен включать ключ перевода "%s" в обеих локалях',
      (path) => {
        expect(readTranslationPath(enTranslations, path)).toBeTruthy();
        expect(readTranslationPath(ruTranslations, path)).toBeTruthy();
      },
    );
  });
});

describe('PokemonTamagotchi — интеграция', () => {
  describe('Сохранение в LocalStorage', () => {
    let persistence: TamagotchiPersistenceService;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({ providers: [TamagotchiPersistenceService] });
      persistence = TestBed.inject(TamagotchiPersistenceService);
    });

    it('должен сохранять действия ухода при симуляции перезагрузки', () => {
      const fixedNow = 1_700_000_000_000;
      let state = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);

      state = {
        ...state,
        status: {
          ...state.status,
          hunger: 50,
        },
      };
      const hungerBefore = state.status.hunger;

      state = feedPokemonState(state, fixedNow);
      persistence.save(state);

      const loaded = persistence.load();

      expect(loaded?.state.pokemon?.id).toBe(TEST_POKEMON.id);
      expect(loaded?.state.status.hunger).toBeGreaterThan(hungerBefore);
    });
  });

  describe('Bootstrap из профиля покемона', () => {
    it('должен записывать ошибку выбора эволюционировавшего покемона в store', async () => {
      const error = signal<string | null>(null);
      const initialized = signal(false);
      const hasPokemon = signal(false);
      const storeMethods = {
        loadFromPersistence: vi.fn(() => {
          initialized.set(true);
        }),
        selectPokemon: vi.fn(),
        setError: vi.fn((value: string) => {
          error.set(value);
        }),
      } as const satisfies Pick<
        TamagotchiStoreSmokeMethodsMock,
        'loadFromPersistence' | 'selectPokemon' | 'setError'
      >;

      const selection = {
        saveSelectedPokemon: vi.fn(),
        validateSelectedPokemon: vi.fn(() =>
          of({ error: 'evolvedPokemon' as const, valid: false as const }),
        ),
      } as const satisfies TamagotchiSelectionSmokeMock;

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: {
              error,
              hasPokemon,
              initialized,
              ...storeMethods,
            },
          },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      await firstValueFrom(service.bootstrapFromProfile());

      expect(storeMethods.loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(storeMethods.setError).toHaveBeenNthCalledWith(1, 'evolvedPokemon');
      expect(error()).toBe('evolvedPokemon');
    });
  });

  describe('Подсказка при отсутствии выбранного покемона', () => {
    let fixture: ComponentFixture<PokemonTamagotchiPageComponent>;

    beforeEach(async () => {
      const initial = createInitialTamagotchiState();
      const storeMethods = {
        checkEvolution: vi.fn(),
        clearError: vi.fn(),
      } as const satisfies Pick<TamagotchiStoreSmokeMethodsMock, 'checkEvolution' | 'clearError'>;

      const storeSignals = {
        achievementList: signal(initial.achievementList),
        canEvolve: signal(false),
        dailyRoutine: signal(initial.dailyRoutine),
        error: signal('noSelection'),
        evolutionProgress: signal(initial.evolutionProgress),
        hasPokemon: signal(false),
        initialized: signal(true),
        interactionHistory: signal(initial.interactionHistory),
        isEvolving: signal(false),
        isSleeping: signal(false),
        isTraining: signal(false),
        lastActionTime: signal(initial.lastActionTime),
        lastDecayTime: signal(initial.lastDecayTime),
        lastSaveTime: signal(initial.lastSaveTime),
        notificationList: signal(initial.notificationList),
        pokemon: signal(null),
        status: signal(initial.status),
        trainingExperienceReward: signal(null),
        trainingStartedAt: signal(null),
      };

      const selection = {
        validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection' as const, valid: false })),
      } as const satisfies Pick<TamagotchiSelectionSmokeMock, 'validateSelectedPokemon'>;

      await TestBed.configureTestingModule({
        imports: [
          PokemonTamagotchiPageComponent,
          TranslocoTestingModule.forRoot({
            langs: {
              en: {
                pokemonTamagotchi: {
                  page: {
                    ariaLabel: 'Tamagotchi',
                    goToProfile: 'Open profile',
                    loading: 'Loading…',
                    noSelectionHint: 'Choose a Pokémon',
                    noSelectionTitle: 'No Pokémon selected',
                    title: 'Pokémon Tamagotchi',
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
          ...createFacadeSmokeProviders(),
          {
            provide: TamagotchiStore,
            useValue: {
              ...storeSignals,
              ...storeMethods,
            },
          },
          { provide: TamagotchiInitService, useValue: createInitSmokeMock() },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
      fixture.detectChanges();
    });

    it('должен показывать подсказку перейти в профиль, если покемон не выбран', () => {
      const title = fixture.nativeElement.querySelector('.tamagotchi-page__empty-title');
      const profileLink = fixture.nativeElement.querySelector('a[routerLink="/profile"]');

      expect(title?.textContent?.trim()).toBe('No Pokémon selected');
      expect(profileLink?.textContent?.trim()).toBe('Open profile');
    });
  });
});
