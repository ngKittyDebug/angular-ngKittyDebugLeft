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
  public readonly notifications = input.required<NotificationModel[]>();

  protected readonly historyOpen = signal(false);

  protected readonly historyNotifications = computed(() =>
    [...this.notifications()].sort((left, right) => right.timestamp - left.timestamp),
  );

  protected readonly hasHistory = computed(() => this.historyNotifications().length > 0);

  protected isTranslationKey(value: string): boolean {
    return value.includes('.');
  }

  protected toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }
}
