import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNotificationService } from '@core/services/app-notification.service';
import { TIMER_CONFIG } from '../../data/constants/timer.constants';
import * as TamagotchiActions from '../../data/store/tamagotchi.actions';
import { createInitialPokemonStatus } from '../../data/store/tamagotchi.state';
import type { Achievement } from '../../models/achievement.model';
import { TamagotchiNotificationService } from './notification.service';

const TRANSLATIONS: Record<string, string> = {
  'pokemonTamagotchi.notifications.alerts.energyCritical.message': 'No energy left.',
  'pokemonTamagotchi.notifications.alerts.energyCritical.title': 'Exhausted!',
  'pokemonTamagotchi.notifications.alerts.hungerLow.message': 'Your Pokémon is hungry.',
  'pokemonTamagotchi.notifications.alerts.hungerLow.title': 'Getting hungry',
  'pokemonTamagotchi.notifications.evolution.readyTitle': 'Ready to evolve!',
};

describe('TamagotchiNotificationService', () => {
  let service: TamagotchiNotificationService;
  let store: MockStore;
  let appNotifications: {
    showErrorNotification: ReturnType<typeof vi.fn>;
    showPositiveNotification: ReturnType<typeof vi.fn>;
    showWarningNotification: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    appNotifications = {
      showErrorNotification: vi.fn(),
      showPositiveNotification: vi.fn(),
      showWarningNotification: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TamagotchiNotificationService,
        provideMockStore(),
        {
          provide: AppNotificationService,
          useValue: appNotifications,
        },
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string) => TRANSLATIONS[key] ?? key,
          },
        },
      ],
    });

    service = TestBed.inject(TamagotchiNotificationService);
    store = TestBed.inject(MockStore);
  });

  it('shows warning toast and stores history for status alerts', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    service.notifyStatusAlerts(['hungerLow']);

    expect(appNotifications.showWarningNotification).toHaveBeenCalledWith(
      'Your Pokémon is hungry.',
      'Getting hungry',
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TamagotchiActions.addNotification.type,
        notification: expect.objectContaining({
          priority: 'warning',
          title: 'alerts.hungerLow.title',
        }),
      }),
    );
  });

  it('merges threshold and periodic critical alerts without duplicates', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const timestamp = 2_000_000;
    const status = {
      ...createInitialPokemonStatus(),
      energy: 5,
    };

    service.processStatusAlerts({
      status,
      thresholdAlerts: ['energyCritical'],
      timestamp,
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(appNotifications.showErrorNotification).toHaveBeenCalledWith(
      'No energy left.',
      'Exhausted!',
    );

    dispatchSpy.mockClear();
    appNotifications.showErrorNotification.mockClear();

    service.processStatusAlerts({
      status,
      thresholdAlerts: [],
      timestamp: timestamp + TIMER_CONFIG.CRITICAL_ALERT_REPEAT_MS,
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('shows positive toast for evolution readiness', () => {
    service.notifyEvolutionReady('Pikachu');

    expect(appNotifications.showPositiveNotification).toHaveBeenCalledWith(
      'Pikachu',
      'Ready to evolve!',
    );
  });

  it('dispatches dismissNotification', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    service.dismiss('notification-1');

    expect(dispatchSpy).toHaveBeenCalledWith(
      TamagotchiActions.dismissNotification({ id: 'notification-1' }),
    );
  });

  it('shows positive toast for achievements', () => {
    const achievement: Achievement = {
      category: 'care',
      description: 'Fed your Pokémon 10 times',
      id: 'care-10',
      name: 'Dedicated caretaker',
      requirements: [],
      reward: { experience: 50, unlockables: [] },
      unlocked: true,
      unlockedAt: Date.now(),
    };

    service.notifyAchievementUnlocked(achievement);

    expect(appNotifications.showPositiveNotification).toHaveBeenCalledWith(
      'Fed your Pokémon 10 times',
      'Dedicated caretaker',
    );
  });
});
