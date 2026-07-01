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
  performanceLabel: 'Performance',
  performanceAria: 'Performance mode',
  performanceEffective: 'Using {{mode}} profile',
  performanceModes: {
    auto: 'Auto',
    balanced: 'Balanced',
    high: 'High',
    low: 'Low power',
  },
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
                appearance: {
                  ariaLabel: 'Appearance',
                  spriteVariationLabel: 'Sprite',
                  spriteVariations: {
                    default: 'Default',
                    retro: 'Retro',
                    shiny: 'Shiny',
                  },
                  stageThemeLabel: 'Theme',
                  stageThemes: {
                    classic: 'Classic',
                    meadow: 'Meadow',
                    night: 'Night',
                  },
                  title: 'Appearance',
                },
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
