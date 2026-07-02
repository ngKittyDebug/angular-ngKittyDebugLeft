import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ɵgetComponentDef } from '@angular/core';
import type { Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideStore, Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, of, take } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import enTranslations from '../../../../public/i18n/pokemonTamagotchi/en.json';
// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import ruTranslations from '../../../../public/i18n/pokemonTamagotchi/ru.json';
import { ChildrenRouts } from '../features.routes';
import { feedPokemon, loadStateSuccess, selectPokemon } from './data/store/tamagotchi.actions';
import { tamagotchiReducer } from './data/store/tamagotchi.reducer';
import { selectTamagotchiError } from './data/store/tamagotchi.selectors';
import {
  createInitialTamagotchiState,
  TAMAGOTCHI_FEATURE_KEY,
} from './data/store/tamagotchi.state';
import { TamagotchiInitService } from './data/services/tamagotchi-init.service';
import { TamagotchiPersistenceService } from './data/services/tamagotchi-persistence.service';
import { PokemonProfileIntegrationService } from './data/services/pokemon-profile-integration.service';
import { TEST_POKEMON } from './data/testing/tamagotchi-arbitraries';
import { pokemonTamagotchiRoutes, TAMAGOTCHI_PATH } from './pokemon-tamagotchi.routes';
import { ActionButtonsComponent } from './ui/components/action-buttons/action-buttons.component';
import { EvolutionAnimationComponent } from './ui/components/evolution-animation/evolution-animation.component';
import { MiniGameContainerComponent } from './ui/components/mini-game-container/mini-game-container.component';
import { NotificationComponent } from './ui/components/notifications/notification.component';
import { PokemonTamagotchiPageComponent } from './ui/components/pokemon-tamagotchi-page/pokemon-tamagotchi-page.component';
import { PokemonSpriteComponent } from './ui/components/pokemon-sprite/pokemon-sprite.component';
import { StatusIndicatorComponent } from './ui/components/status-indicator/status-indicator.component';

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
  'miniGame.title',
  'notifications.empty',
] as const;

const STANDALONE_COMPONENTS: Type<unknown>[] = [
  PokemonTamagotchiPageComponent,
  StatusIndicatorComponent,
  ActionButtonsComponent,
  PokemonSpriteComponent,
  MiniGameContainerComponent,
  NotificationComponent,
  EvolutionAnimationComponent,
];

function readTranslationPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function expectStandaloneComponent(component: Type<unknown>): void {
  const definition = ɵgetComponentDef(component);

  expect(definition).toBeDefined();
  expect(definition?.standalone).not.toBe(false);
}

describe('Feature: pokemon-tamagotchi, Smoke Tests', () => {
  describe('Route configuration', () => {
    it('should register lazy route at /tamagotchi', () => {
      const route = pokemonTamagotchiRoutes.find((entry) => entry.path === TAMAGOTCHI_PATH);

      expect(route).toBeDefined();
      expect(route?.loadComponent).toBeTypeOf('function');
      expect(route?.providers?.length).toBeGreaterThan(0);
    });

    it('should lazy-load PokemonTamagotchiPageComponent', async () => {
      const route = pokemonTamagotchiRoutes.find((entry) => entry.path === TAMAGOTCHI_PATH);
      const loaded = await route?.loadComponent?.();

      expect(loaded).toBe(PokemonTamagotchiPageComponent);
    });

    it('should be included in application feature routes', () => {
      const registered = ChildrenRouts.some((entry) => entry.path === TAMAGOTCHI_PATH);

      expect(registered).toBe(true);
    });
  });

  describe('Standalone component architecture', () => {
    it.each(STANDALONE_COMPONENTS.map((component) => [component.name, component] as const))(
      'should declare %s as standalone',
      (_name, component) => {
        expectStandaloneComponent(component);
      },
    );
  });

  describe('Translation assets', () => {
    it('should ship non-empty English and Russian locale files', () => {
      expect(Object.keys(enTranslations).length).toBeGreaterThan(0);
      expect(Object.keys(ruTranslations).length).toBeGreaterThan(0);
    });

    it.each(REQUIRED_TRANSLATION_PATHS)(
      'should include translation key "%s" in both locales',
      (path) => {
        expect(readTranslationPath(enTranslations, path)).toBeTruthy();
        expect(readTranslationPath(ruTranslations, path)).toBeTruthy();
      },
    );
  });
});

describe('Feature: pokemon-tamagotchi, Integration Tests', () => {
  describe('LocalStorage persistence', () => {
    let persistence: TamagotchiPersistenceService;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({});
      persistence = TestBed.inject(TamagotchiPersistenceService);
    });

    it('should persist care actions across reload simulation', () => {
      let state = tamagotchiReducer(
        createInitialTamagotchiState(),
        selectPokemon({ pokemon: TEST_POKEMON }),
      );

      state = {
        ...state,
        status: {
          ...state.status,
          hunger: 50,
        },
      };
      const hungerBefore = state.status.hunger;

      state = tamagotchiReducer(state, feedPokemon());
      persistence.save(state);

      const loaded = persistence.load();

      expect(loaded?.state.pokemon?.id).toBe(TEST_POKEMON.id);
      expect(loaded?.state.status.hunger).toBeGreaterThan(hungerBefore);
    });
  });

  describe('Pokemon profile bootstrap', () => {
    it('should surface evolved pokemon selection error in store', async () => {
      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          provideStore({ [TAMAGOTCHI_FEATURE_KEY]: tamagotchiReducer }),
          {
            provide: PokemonProfileIntegrationService,
            useValue: {
              saveSelectedPokemon: vi.fn(),
              validateSelectedPokemon: vi.fn(() =>
                of({ error: 'evolvedPokemon', valid: false as const }),
              ),
            },
          },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);
      const store = TestBed.inject(Store);

      store.dispatch(
        loadStateSuccess({
          state: {
            ...createInitialTamagotchiState(),
            pokemon: null,
          },
        }),
      );

      await firstValueFrom(service.bootstrapFromProfile());

      const selectionError = await firstValueFrom(
        store.select(selectTamagotchiError).pipe(take(1)),
      );

      expect(selectionError).toBe('evolvedPokemon');
    });
  });

  describe('No-selection user guidance', () => {
    let fixture: ComponentFixture<PokemonTamagotchiPageComponent>;

    beforeEach(async () => {
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
          provideMockStore({
            initialState: {
              [TAMAGOTCHI_FEATURE_KEY]: {
                ...createInitialTamagotchiState(),
                error: 'noSelection',
                initialized: true,
                pokemon: null,
              },
            },
          }),
          {
            provide: TamagotchiInitService,
            useValue: {
              bootstrapFromProfile: vi.fn(() => of(undefined)),
            },
          },
          {
            provide: PokemonProfileIntegrationService,
            useValue: {
              validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection', valid: false })),
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
      fixture.detectChanges();
    });

    it('should show profile guidance when no pokemon is selected', () => {
      const title = fixture.nativeElement.querySelector('.tamagotchi-page__empty-title');
      const profileLink = fixture.nativeElement.querySelector('a[routerLink="/profile"]');

      expect(title?.textContent?.trim()).toBe('No Pokémon selected');
      expect(profileLink?.textContent?.trim()).toBe('Open profile');
    });
  });
});
