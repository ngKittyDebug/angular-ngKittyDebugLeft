import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import type { NotificationModel } from '../../../data/models/notification.model';

@Component({
  selector: 'left-paw-tamagotchi-notifications',
  imports: [TranslocoDirective, TuiButton],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  public readonly notificationList = input.required<NotificationModel[]>();

  protected readonly historyListId = 'tamagotchi-notifications-history';
  protected readonly historyOpen = signal(false);

  protected readonly historyNotificationList = computed(() =>
    [...this.notificationList()].sort((left, right) => right.timestamp - left.timestamp),
  );

  protected readonly hasHistory = computed(() => this.historyNotificationList().length > 0);

  protected onHistoryToggle(): void {
    this.historyOpen.update((open) => !open);
  }
}
