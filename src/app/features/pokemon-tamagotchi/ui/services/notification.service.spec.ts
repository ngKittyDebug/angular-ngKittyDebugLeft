import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNotificationService } from '@core/services/app-notification.service';
import { TIMER_CONFIG } from '../../data/constants/timer.constants';
import { TamagotchiStore } from '../../data/store/tamagotchi.store';
import { createInitialPokemonStatus } from '../../data/store/tamagotchi-initial';
import type { AchievementModel } from '../../data/models/achievement.model';
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
  let addNotification: ReturnType<typeof vi.fn>;
  let dismissNotification: ReturnType<typeof vi.fn>;
  let appNotifications: {
    showErrorNotification: ReturnType<typeof vi.fn>;
    showPositiveNotification: ReturnType<typeof vi.fn>;
    showWarningNotification: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    addNotification = vi.fn();
    dismissNotification = vi.fn();
    appNotifications = {
      showErrorNotification: vi.fn(),
      showPositiveNotification: vi.fn(),
      showWarningNotification: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TamagotchiNotificationService,
        {
          provide: TamagotchiStore,
          useValue: {
            addNotification,
            dismissNotification,
          },
        },
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
  });

  it('shows warning toast and stores history for status alerts', () => {
    service.notifyStatusAlerts(['hungerLow']);

    expect(appNotifications.showWarningNotification).toHaveBeenCalledWith(
      'Your Pokémon is hungry.',
      'Getting hungry',
    );
    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'warning',
        title: 'alerts.hungerLow.title',
      }),
    );
  });

  it('merges threshold and periodic critical alerts without duplicates', () => {
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

    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(appNotifications.showErrorNotification).toHaveBeenCalledWith(
      'No energy left.',
      'Exhausted!',
    );

    addNotification.mockClear();
    appNotifications.showErrorNotification.mockClear();

    service.processStatusAlerts({
      status,
      thresholdAlerts: [],
      timestamp: timestamp + TIMER_CONFIG.CRITICAL_ALERT_REPEAT_MS,
    });

    expect(addNotification).toHaveBeenCalledTimes(1);
  });

  it('shows positive toast for evolution readiness', () => {
    service.notifyEvolutionReady('Pikachu');

    expect(appNotifications.showPositiveNotification).toHaveBeenCalledWith(
      'Pikachu',
      'Ready to evolve!',
    );
  });

  it('dismisses notification via store', () => {
    service.dismiss('notification-1');

    expect(dismissNotification).toHaveBeenCalledTimes(1);
    expect(dismissNotification).toHaveBeenCalledWith('notification-1');
  });

  it('shows positive toast for achievements', () => {
    const achievement: AchievementModel = {
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
