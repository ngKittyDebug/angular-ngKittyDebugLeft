import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { AppNotificationService } from '@core/services/app-notification.service';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';
import { TamagotchiStore } from '../store/tamagotchi.store';
import { TamagotchiNotificationService } from './tamagotchi-notification.service';

const TRANSLATIONS: Record<string, string> = {
  'pokemonTamagotchi.notifications.alerts.energyCritical.message': 'No energy left.',
  'pokemonTamagotchi.notifications.alerts.energyCritical.title': 'Exhausted!',
  'pokemonTamagotchi.notifications.alerts.hungerLow.message': 'Your Pokémon is hungry.',
  'pokemonTamagotchi.notifications.alerts.hungerLow.title': 'Getting hungry',
  'pokemonTamagotchi.notifications.evolution.readyTitle': 'Ready to evolve!',
};

type NotificationTranslocoMock = MockedObject<{
  selectTranslate(
    key: string,
    parameters: Record<string, never>,
    scope: string,
  ): Observable<string>;
}>;

async function flushTranslation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('TamagotchiNotificationService', () => {
  let service: TamagotchiNotificationService;
  let storeMock: MockedObject<Pick<InstanceType<typeof TamagotchiStore>, 'addNotification'>>;
  let appNotifications: MockedObject<
    Pick<
      AppNotificationService,
      'showErrorNotification' | 'showPositiveNotification' | 'showWarningNotification'
    >
  >;

  beforeEach(() => {
    storeMock = {
      addNotification: vi.fn(),
    } as const satisfies MockedObject<
      Pick<InstanceType<typeof TamagotchiStore>, 'addNotification'>
    >;

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

    const translocoMock = {
      selectTranslate: vi.fn((key: string, _parameters: Record<string, never>, scope: string) =>
        of(TRANSLATIONS[`${scope}.${key}`] ?? `${scope}.${key}`),
      ),
    } as const satisfies NotificationTranslocoMock;

    TestBed.configureTestingModule({
      providers: [
        TamagotchiNotificationService,
        { provide: TamagotchiStore, useValue: storeMock },
        { provide: AppNotificationService, useValue: appNotifications },
        { provide: TranslocoService, useValue: translocoMock },
      ],
    });

    service = TestBed.inject(TamagotchiNotificationService);
  });

  describe('Happy Path', () => {
    it('должен показывать warning toast и сохранять историю для status alerts', async () => {
      service.notifyStatusAlerts(['hungerLow']);
      await flushTranslation();

      expect(appNotifications.showWarningNotification).toHaveBeenNthCalledWith(
        1,
        'Your Pokémon is hungry.',
        'Getting hungry',
      );
      expect(storeMock.addNotification).toHaveBeenCalledTimes(1);
      expect(storeMock.addNotification).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          priority: 'warning',
          title: { key: 'alerts.hungerLow.title', kind: 'translationKey' },
        }),
      );
    });

    it('должен показывать positive toast при готовности к эволюции', async () => {
      service.notifyEvolutionReady('Pikachu');
      await flushTranslation();

      expect(appNotifications.showPositiveNotification).toHaveBeenNthCalledWith(
        1,
        'Pikachu',
        'Ready to evolve!',
      );
    });

    it('не должен переводить имя покемона с точкой как i18n-ключ', async () => {
      service.notifyEvolutionReady('Mr. Mime');
      await flushTranslation();

      expect(appNotifications.showPositiveNotification).toHaveBeenNthCalledWith(
        1,
        'Mr. Mime',
        'Ready to evolve!',
      );
    });
  });

  describe('Edge Cases', () => {
    it('должен объединять пороговые и периодические critical alerts без дубликатов', async () => {
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
      await flushTranslation();

      expect(storeMock.addNotification).toHaveBeenCalledTimes(1);
      expect(appNotifications.showErrorNotification).toHaveBeenNthCalledWith(
        1,
        'No energy left.',
        'Exhausted!',
      );

      storeMock.addNotification.mockClear();
      appNotifications.showErrorNotification.mockClear();

      service.processStatusAlerts({
        status,
        thresholdAlerts: [],
        timestamp: timestamp + TIMER_CONFIG.CRITICAL_ALERT_REPEAT_MS,
      });
      await flushTranslation();

      expect(storeMock.addNotification).toHaveBeenCalledTimes(1);
    });
  });
});
