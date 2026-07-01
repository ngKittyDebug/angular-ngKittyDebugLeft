import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  notificationFromAchievement,
  notificationFromEvolutionReady,
  notificationFromStatusAlert,
} from '../../data/helpers/notification-factory.helper';
import * as TamagotchiActions from '../../data/store/tamagotchi.actions';
import type { Achievement } from '../../models/achievement.model';
import type { Notification } from '../../models/notification.model';
import type { StatusAlertType } from '../../models/notification.model';

@Injectable({ providedIn: 'root' })
export class TamagotchiNotificationService {
  private readonly store = inject(Store);

  public add(notification: Notification): void {
    this.store.dispatch(TamagotchiActions.addNotification({ notification }));
  }

  public dismiss(id: string): void {
    this.store.dispatch(TamagotchiActions.dismissNotification({ id }));
  }

  public markAsRead(id: string): void {
    this.store.dispatch(TamagotchiActions.markNotificationRead({ id }));
  }

  public notifyStatusAlerts(alerts: StatusAlertType[], timestamp?: number): void {
    for (const alertType of alerts) {
      this.add(notificationFromStatusAlert(alertType, timestamp));
    }
  }

  public notifyEvolutionReady(pokemonName: string, timestamp?: number): void {
    this.add(notificationFromEvolutionReady(pokemonName, timestamp));
  }

  public notifyAchievementUnlocked(achievement: Achievement, timestamp?: number): void {
    this.add(notificationFromAchievement(achievement, timestamp));
  }
}
