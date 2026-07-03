import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
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
  let appNotifications: MockedObject<
    Pick<
      AppNotificationService,
      'showErrorNotification' | 'showPositiveNotification' | 'showWarningNotification'
    >
  >;

  beforeEach(() => {
    addNotification = vi.fn();
    appNotifications = {
      showErrorNotification: vi.fn(),
      showPositiveNotification: vi.fn(),
      showWarningNotification: vi.fn(),
    } as const satisfies MockedObject<
      Pick<
        AppNotificationService,
        'showErrorNotification' | 'showPositiveNotification' | 'showWarningNotification'
      >
    >;

    TestBed.configureTestingModule({
      providers: [
        TamagotchiNotificationService,
        {
          provide: TamagotchiStore,
          useValue: {
            addNotification,
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

  describe('Happy Path', () => {
    it('должен показывать warning toast и сохранять историю для status alerts', () => {
      service.notifyStatusAlerts(['hungerLow']);

      expect(appNotifications.showWarningNotification).toHaveBeenNthCalledWith(
        1,
        'Your Pokémon is hungry.',
        'Getting hungry',
      );
      expect(addNotification).toHaveBeenCalledTimes(1);
      expect(addNotification).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          priority: 'warning',
          title: 'alerts.hungerLow.title',
        }),
      );
    });

    it('должен показывать positive toast при готовности к эволюции', () => {
      service.notifyEvolutionReady('Pikachu');

      expect(appNotifications.showPositiveNotification).toHaveBeenNthCalledWith(
        1,
        'Pikachu',
        'Ready to evolve!',
      );
    });

    it('должен показывать positive toast для достижений', () => {
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

      expect(appNotifications.showPositiveNotification).toHaveBeenNthCalledWith(
        1,
        'Fed your Pokémon 10 times',
        'Dedicated caretaker',
      );
    });
  });

  describe('Edge Cases', () => {
    it('должен объединять пороговые и периодические critical alerts без дубликатов', () => {
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
      expect(appNotifications.showErrorNotification).toHaveBeenNthCalledWith(
        1,
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
  });
});
