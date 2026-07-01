import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as TamagotchiActions from '../../data/store/tamagotchi.actions';
import type { Achievement } from '../../models/achievement.model';
import { TamagotchiNotificationService } from './notification.service';

describe('TamagotchiNotificationService', () => {
  let service: TamagotchiNotificationService;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TamagotchiNotificationService, provideMockStore()],
    });

    service = TestBed.inject(TamagotchiNotificationService);
    store = TestBed.inject(MockStore);
  });

  it('dispatches addNotification for status alerts', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    service.notifyStatusAlerts(['hungerLow']);

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

  it('dispatches dismissNotification', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    service.dismiss('notification-1');

    expect(dispatchSpy).toHaveBeenCalledWith(
      TamagotchiActions.dismissNotification({ id: 'notification-1' }),
    );
  });

  it('dispatches achievement notification', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
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

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TamagotchiActions.addNotification.type,
        notification: expect.objectContaining({
          priority: 'achievement',
          title: 'Dedicated caretaker',
        }),
      }),
    );
  });
});
