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
    this.alerts
      .open(message, { label, appearance: NotificationAppearances.Error, autoClose: closeTime })
      .subscribe();
  }

  public showWarningNotification(
    message: string,
    label: string = NotificationLabels.Warning,
    closeTime = DEFAULT_ALERT_CLOSE_TIME,
  ): void {
    this.alerts
      .open(message, { label, appearance: NotificationAppearances.Warning, autoClose: closeTime })
      .subscribe();
  }

  public showPositiveNotification(
    message: string,
    label: string = NotificationLabels.Positive,
    closeTime = DEFAULT_ALERT_CLOSE_TIME,
  ): void {
    this.alerts
      .open(message, { label, appearance: NotificationAppearances.Positive, autoClose: closeTime })
      .subscribe();
  }
}
