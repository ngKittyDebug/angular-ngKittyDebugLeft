import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PokemonProfileIntegrationService } from '../../../data/services/pokemon-profile-integration.service';
import { TEST_POKEMON } from '../../../data/testing/tamagotchi-arbitraries';
import {
  createInitialTamagotchiState,
  TAMAGOTCHI_FEATURE_KEY,
} from '../../../data/store/tamagotchi.state';
import { PokemonTamagotchiPageComponent } from './pokemon-tamagotchi-page.component';

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
                page: {
                  ariaLabel: 'Tamagotchi',
                  title: 'Pokémon Tamagotchi',
                  noSelectionTitle: 'No Pokémon selected',
                  noSelectionHint: 'Choose a Pokémon',
                  goToProfile: 'Open profile',
                  evolvedPokemonError: 'Evolved',
                  loadFailedError: 'Load failed',
                  levelBadge: 'Lv. {{level}}',
                },
                status: {
                  health: 'Health',
                  hunger: 'Hunger',
                  mood: 'Mood',
                  energy: 'Energy',
                  hydration: 'Hydration',
                  experience: 'Experience',
                  tooltip: '{{label}}: {{value}} / {{max}}',
                  levelTooltip: 'Level {{level}}',
                },
                actions: {
                  feed: 'Feed',
                  water: 'Water',
                  care: 'Care',
                  play: 'Play',
                  train: 'Train',
                  sleep: 'Sleep',
                  wakeUp: 'Wake up',
                  cooldown: '{{seconds}}s',
                  disabledCooldown: 'Cooldown',
                  disabledLowEnergy: 'Low energy',
                },
                miniGame: {
                  title: 'Training',
                  instruction: 'Tap targets',
                  score: 'Score {{score}}',
                  timeLeft: '{{seconds}}s',
                  finish: 'Finish',
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
            [TAMAGOTCHI_FEATURE_KEY]: createInitialTamagotchiState(),
          },
        }),
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
});
