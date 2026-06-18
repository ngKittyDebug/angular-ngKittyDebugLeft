import { inject, Service } from '@angular/core';
import { TuiNotificationService } from '@taiga-ui/core';

const DEFAULT_ALERT_CLOSE_TIME = 4000;

export enum NotificationLabels {
  Error = 'error',
  Warning = 'warning',
  Positive = 'meow',
}

export enum NotificationAppearances {
  Error = 'negative',
  Warning = 'warning',
  Positive = 'positive',
}

@Service()
export class AppNotificationService {
  private readonly alerts = inject(TuiNotificationService);

  public showErrorNotification(
    message: string,
    label: string = NotificationLabels.Error,
    closeTime = DEFAULT_ALERT_CLOSE_TIME,
  ): void {
    this.showNotification(NotificationAppearances.Error, message, label, closeTime);
  }

  public showWarningNotification(
    message: string,
    label: string = NotificationLabels.Warning,
    closeTime = DEFAULT_ALERT_CLOSE_TIME,
  ): void {
    this.showNotification(NotificationAppearances.Warning, message, label, closeTime);
  }

  public showPositiveNotification(
    message: string,
    label: string = NotificationLabels.Positive,
    closeTime = DEFAULT_ALERT_CLOSE_TIME,
  ): void {
    this.showNotification(NotificationAppearances.Positive, message, label, closeTime);
  }

  private showNotification(
    appearance: NotificationAppearances,
    message: string,
    label: string,
    closeTime: number,
  ): void {
    this.alerts.open(message, { label, appearance, autoClose: closeTime }).subscribe();
  }
}
