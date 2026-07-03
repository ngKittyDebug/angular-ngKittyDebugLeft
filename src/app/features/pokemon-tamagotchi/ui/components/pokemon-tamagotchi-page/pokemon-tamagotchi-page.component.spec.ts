import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PokemonProfileIntegrationService } from '../../../data/services/pokemon-profile-integration.service';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { TEST_POKEMON } from '../../../data/testing/tamagotchi-arbitraries';
import {
  createInitialPokemonStatus,
  createInitialTamagotchiState,
} from '../../../data/store/tamagotchi-initial';
import { TamagotchiStore } from '../../../data/store/tamagotchi.store';
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

function createStoreMock(
  overrides: {
    error?: string | null;
    initialized?: boolean;
    pokemon?: typeof TEST_POKEMON | null;
  } = {},
) {
  const initial = createInitialTamagotchiState();

  return {
    achievements: signal(initial.achievements),
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
    isTraining: signal(false),
    lastActionTime: signal(initial.lastActionTime),
    lastDecayTime: signal(initial.lastDecayTime),
    lastSaveTime: signal(initial.lastSaveTime),
    notifications: signal(initial.notifications),
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
        {
          provide: TamagotchiStore,
          useValue: createStoreMock(),
        },
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
        {
          provide: TamagotchiStore,
          useValue: createStoreMock({ initialized: false, pokemon: null }),
        },
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
