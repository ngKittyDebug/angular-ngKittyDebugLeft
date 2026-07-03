import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AppNotificationService } from '@core/services/app-notification.service';
import {
  notificationFromAchievement,
  notificationFromEvolutionReady,
  notificationFromStatusAlert,
} from '../../data/helpers/notification-factory.helper';
import { detectPeriodicCriticalAlerts } from '../../data/helpers/status-decay.helper';
import { TamagotchiStore } from '../../data/store/tamagotchi.store';
import type { AchievementModel } from '../../data/models/achievement.model';
import type {
  NotificationModel,
  NotificationPriority,
  StatusAlertType,
} from '../../data/models/notification.model';
import type { PokemonStatusModel } from '../../data/models/pokemon-status.model';

const NOTIFICATION_SCOPE = 'pokemonTamagotchi.notifications';

export interface StatusAlertNotificationContext {
  status: PokemonStatusModel;
  thresholdAlerts: StatusAlertType[];
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class TamagotchiNotificationService {
  private readonly appNotifications = inject(AppNotificationService);
  private readonly store = inject(TamagotchiStore);
  private readonly transloco = inject(TranslocoService);
  private readonly lastCriticalAlertAt: Partial<Record<StatusAlertType, number>> = {};

  public processStatusAlerts(context: StatusAlertNotificationContext): void {
    const timestamp = context.timestamp ?? Date.now();
    const periodicAlerts = detectPeriodicCriticalAlerts(
      context.status,
      this.lastCriticalAlertAt,
      timestamp,
    );
    const alerts = [...new Set([...context.thresholdAlerts, ...periodicAlerts])];

    for (const alertType of alerts) {
      this.notifyStatusAlert(alertType, timestamp);
    }
  }

  public notifyStatusAlerts(alerts: StatusAlertType[], timestamp?: number): void {
    for (const alertType of alerts) {
      this.notifyStatusAlert(alertType, timestamp);
    }
  }

  public notifyEvolutionReady(pokemonName: string, timestamp?: number): void {
    this.publish(notificationFromEvolutionReady(pokemonName, timestamp));
  }

  public notifyAchievementUnlocked(achievement: AchievementModel, timestamp?: number): void {
    this.publish(notificationFromAchievement(achievement, timestamp));
  }

  private notifyStatusAlert(alertType: StatusAlertType, timestamp?: number): void {
    const notification = notificationFromStatusAlert(alertType, timestamp);

    if (notification.priority === 'critical') {
      this.lastCriticalAlertAt[alertType] = notification.timestamp;
    }

    this.publish(notification);
  }

  private publish(notification: NotificationModel): void {
    this.store.addNotification(notification);

    const label = this.resolveText(notification.title);
    const message = this.resolveText(notification.message);

    this.showByPriority(notification.priority, message, label);
  }

  private resolveText(value: string): string {
    if (!value.includes('.')) {
      return value;
    }

    return this.translate(value);
  }

  private translate(key: string): string {
    return this.transloco.translate(`${NOTIFICATION_SCOPE}.${key}`);
  }

  private showByPriority(priority: NotificationPriority, message: string, label: string): void {
    if (priority === 'critical') {
      this.appNotifications.showErrorNotification(message, label);

      return;
    }

    if (priority === 'warning' || priority === 'info') {
      this.appNotifications.showWarningNotification(message, label);

      return;
    }

    this.appNotifications.showPositiveNotification(message, label);
  }
}
