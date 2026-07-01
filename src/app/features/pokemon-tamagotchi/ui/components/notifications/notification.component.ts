import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiNotification, TuiTitle } from '@taiga-ui/core';
import { compareNotificationsByPriority } from '../../../data/helpers/notification-factory.helper';
import type { Notification, NotificationPriority } from '../../../models/notification.model';
import type { ActionType } from '../../../models/tamagotchi-state.model';

const PRIORITY_APPEARANCE: Record<NotificationPriority, string> = {
  achievement: 'positive',
  critical: 'negative',
  info: 'neutral',
  warning: 'warning',
};

const PRIORITY_ICON: Record<NotificationPriority, string> = {
  achievement: '@tui.trophy',
  critical: '@tui.alert-circle',
  info: '@tui.info',
  warning: '@tui.alert-triangle',
};

@Component({
  selector: 'left-paw-tamagotchi-notifications',
  imports: [TranslocoDirective, TuiButton, TuiNotification, TuiTitle],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  public readonly notifications = input.required<Notification[]>();

  public readonly actionSelected = output<ActionType>();
  public readonly dismissed = output<string>();

  protected readonly historyOpen = signal(false);

  protected readonly activeNotifications = computed(() =>
    [...this.notifications()]
      .filter((notification) => !notification.read)
      .sort(compareNotificationsByPriority),
  );

  protected readonly historyNotifications = computed(() =>
    [...this.notifications()].sort((left, right) => right.timestamp - left.timestamp),
  );

  protected readonly hasHistory = computed(() => this.historyNotifications().length > 0);

  protected appearanceFor(priority: NotificationPriority): string {
    return PRIORITY_APPEARANCE[priority];
  }

  protected iconFor(priority: NotificationPriority): string {
    return PRIORITY_ICON[priority];
  }

  protected isTranslationKey(value: string): boolean {
    return value.includes('.');
  }

  protected onDismiss(id: string): void {
    this.dismissed.emit(id);
  }

  protected onAction(action: ActionType): void {
    this.actionSelected.emit(action);
  }

  protected toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }
}
