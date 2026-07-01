import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PokemonProfileIntegrationService } from '../../../data/services/pokemon-profile-integration.service';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { TEST_POKEMON } from '../../../data/testing/tamagotchi-arbitraries';
import {
  createInitialTamagotchiState,
  TAMAGOTCHI_FEATURE_KEY,
} from '../../../data/store/tamagotchi.state';
import { PokemonTamagotchiPageComponent } from './pokemon-tamagotchi-page.component';

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
  title: 'Pokémon Tamagotchi',
};

describe('PokemonTamagotchiPageComponent', () => {
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
                miniGame: {
                  finish: 'Finish',
                  instruction: 'Tap targets',
                  score: 'Score {{score}}',
                  timeLeft: '{{seconds}}s',
                  title: 'Training',
                },
                notifications: {
                  dismiss: 'Dismiss',
                  empty: 'No notifications',
                  hideHistory: 'Hide history',
                  showHistory: 'Show history',
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
        provideMockStore({
          initialState: {
            [TAMAGOTCHI_FEATURE_KEY]: {
              ...createInitialTamagotchiState(),
              initialized: true,
              pokemon: TEST_POKEMON,
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
            loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
            saveSelectedPokemon: vi.fn(),
            validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection', valid: false })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render page title', () => {
    const title = fixture.nativeElement.querySelector('.tamagotchi-page__title');

    expect(title?.textContent?.trim()).toBe('Pokémon Tamagotchi');
  });

  it('should render status indicators when pokemon is loaded', () => {
    const indicators = fixture.nativeElement.querySelectorAll('left-paw-status-indicator');

    expect(indicators.length).toBe(6);
  });

  it('should render notifications panel', () => {
    const notifications = fixture.nativeElement.querySelector('left-paw-tamagotchi-notifications');

    expect(notifications).toBeTruthy();
  });
});

describe('PokemonTamagotchiPageComponent loading state', () => {
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
        provideMockStore({
          initialState: {
            [TAMAGOTCHI_FEATURE_KEY]: createInitialTamagotchiState(),
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
            loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
            saveSelectedPokemon: vi.fn(),
            validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection', valid: false })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonTamagotchiPageComponent);
    fixture.detectChanges();
  });

  it('should show loading state while store is not initialized', () => {
    const loading = fixture.nativeElement.querySelector('.tamagotchi-page__loading');

    expect(loading).toBeTruthy();
    expect(loading?.textContent).toContain('Loading…');
  });
});
