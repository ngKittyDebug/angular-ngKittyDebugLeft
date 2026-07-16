import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TamagotchiSelectionService } from '../../../data/services/tamagotchi-selection.service';
import { EvolutionService } from '../../../data/services/evolution.service';
import { PerformanceService } from '../../../data/services/performance.service';
import {
  createTamagotchiInitMock,
  type TamagotchiInitMock,
} from '../../../data/services/tamagotchi-init.service.mock';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { createTamagotchiSelectionMock } from '../../../data/services/tamagotchi-selection.service.mock';
import { TamagotchiService } from '../../../data/services/tamagotchi.service';
import { TimerService } from '../../../data/services/timer.service';
import { TEST_POKEMON } from '../../../data/fixtures/tamagotchi-arbitraries';
import {
  createTamagotchiStoreMock,
  type TamagotchiStoreMock,
} from '../../../data/store/tamagotchi.store.mock';
import { TamagotchiStore } from '../../../data/store/tamagotchi.store';
import { TamagotchiFacade } from '../../../data/facades/tamagotchi.facade';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../../../data/constants/system-errors.constants';
import { AnimationService } from '../../services/animation.service';
import { TamagotchiNotificationService } from '../../../data/services/tamagotchi-notification.service';
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
    let initService: TamagotchiInitMock;
    let storeMock: TamagotchiStoreMock;

    beforeEach(async () => {
      initService = createTamagotchiInitMock();
      storeMock = createTamagotchiStoreMock();

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
                    cooldownAria: '{{action}} — available in {{seconds}}s',
                    disabledAria: '{{action}} — unavailable: {{reason}}',
                    disabledCooldown: 'Cooldown',
                    disabledLowEnergy: 'Low energy',
                    disabledTraining: 'Training',
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
                  notifications: {
                    empty: 'No notifications yet',
                    hideHistory: 'Hide history',
                    showHistory: 'Show history',
                  },
                  page: PAGE_TRANSLATIONS,
                  sprite: {
                    petAria: 'Pet {{name}}. Enter: tap',
                  },
                  status: {
                    alertCritical: '{{label}}: {{value}} / {{max}} — critical',
                    alertWarning: '{{label}}: {{value}} / {{max}} — warning',
                    criticalBadge: 'Critical',
                    energy: 'Energy',
                    experience: 'Experience',
                    health: 'Health',
                    hunger: 'Hunger',
                    hydration: 'Hydration',
                    levelTooltip: 'Level {{level}}',
                    mood: 'Mood',
                    tooltip: '{{label}}: {{value}} / {{max}}',
                    warningBadge: 'Warning',
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
          { provide: TamagotchiStore, useValue: storeMock },
          { provide: TamagotchiInitService, useValue: initService },
          {
            provide: TamagotchiSelectionService,
            useValue: createTamagotchiSelectionMock({
              loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
            }),
          },
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

    it('должен ставить фокус на заголовок после выхода из загрузки', () => {
      const title = fixture.nativeElement.querySelector('.tamagotchi-page__title') as HTMLElement;

      expect(title.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).not.toBe(title);

      storeMock.initialized.set(false);
      fixture.detectChanges();
      storeMock.initialized.set(true);
      fixture.detectChanges();

      expect(document.activeElement).toBe(title);
    });

    it('должен ставить фокус на system-notice при появлении ошибки', () => {
      storeMock.error.set(TAMAGOTCHI_SYSTEM_ERRORS.SAVE_FAILED);
      fixture.detectChanges();

      const notice = fixture.nativeElement.querySelector(
        '.tamagotchi-page__system-notice',
      ) as HTMLElement;

      expect(notice.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(notice);
    });

    it('должен возвращать фокус на заголовок после закрытия system-notice', () => {
      storeMock.error.set(TAMAGOTCHI_SYSTEM_ERRORS.SAVE_FAILED);
      fixture.detectChanges();

      storeMock.error.set(null);
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.tamagotchi-page__title') as HTMLElement;

      expect(document.activeElement).toBe(title);
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
            useValue: createTamagotchiStoreMock({ initialized: false, pokemon: null }),
          },
          { provide: TamagotchiInitService, useValue: createTamagotchiInitMock() },
          {
            provide: TamagotchiSelectionService,
            useValue: createTamagotchiSelectionMock({
              loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
            }),
          },
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
    let storeMock: TamagotchiStoreMock;

    beforeEach(async () => {
      storeMock = createTamagotchiStoreMock({
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
          { provide: TamagotchiInitService, useValue: createTamagotchiInitMock() },
          {
            provide: TamagotchiSelectionService,
            useValue: createTamagotchiSelectionMock({
              loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
            }),
          },
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
