import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, take } from 'rxjs';
import { AppNotificationService } from '@core/services/app-notification.service';
import {
  notificationFromEvolutionReady,
  notificationFromStatusAlert,
} from '../helpers/notification-factory.helper';
import { detectPeriodicCriticalAlerts } from '../helpers/status-decay.helper';
import type {
  NotificationModel,
  NotificationPriority,
  NotificationText,
  StatusAlertType,
} from '../models/notification.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import { TamagotchiStore } from '../store/tamagotchi.store';

const NOTIFICATION_KEY_PREFIX = 'notifications';
const TRANSLATION_SCOPE = 'pokemonTamagotchi';

export interface StatusAlertNotificationContext {
  status: PokemonStatusModel;
  thresholdAlerts: StatusAlertType[];
  timestamp?: number;
}

@Service({ autoProvided: false })
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

  public notifyEvolutionReady(pokemonName: string, timestamp?: number): void {
    this.publish(notificationFromEvolutionReady(pokemonName, timestamp));
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
    void this.showNotification(notification);
  }

  private async showNotification(notification: NotificationModel): Promise<void> {
    const [label, message] = await Promise.all([
      this.resolveText(notification.title),
      this.resolveText(notification.message),
    ]);

    this.showByPriority(notification.priority, message, label);
  }

  private resolveText(value: NotificationText): Promise<string> {
    if (value.kind === 'plainText') {
      return Promise.resolve(value.text);
    }

    return this.translate(value.key);
  }

  private translate(key: string): Promise<string> {
    return firstValueFrom(
      this.transloco
        .selectTranslate<string>(`${NOTIFICATION_KEY_PREFIX}.${key}`, {}, TRANSLATION_SCOPE)
        .pipe(take(1)),
    );
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
