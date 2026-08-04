import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHint } from '@taiga-ui/core';
import { TuiBadge, TuiProgress, TuiStatus } from '@taiga-ui/kit';
import { STATUS_THRESHOLDS } from '../../../data/constants/status-thresholds.constants';
import {
  getStatusIndicatorLevel,
  getThresholdsForStatusType,
  resolveStatusIndicatorColor,
  type StatusIndicatorLevel,
} from '../../../data/helpers/status-indicator.helper';
import type { StatusThresholdsModel, StatusType } from '../../../data/models/pokemon-status.model';

@Component({
  selector: 'left-paw-status-indicator',
  imports: [TranslocoDirective, TuiBadge, TuiHint, TuiProgress, TuiStatus],
  templateUrl: './status-indicator.component.html',
  styleUrl: './status-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusIndicatorComponent {
  private previousAlertLevel: StatusIndicatorLevel | null | undefined = undefined;

  public readonly currentValue = input.required<number>();
  public readonly maxValue = input<number>(100);
  public readonly statusType = input.required<StatusType>();
  public readonly thresholds = input<StatusThresholdsModel>(STATUS_THRESHOLDS);
  public readonly level = input<number | null>(null);

  protected readonly displayValue = computed(() => Math.round(this.currentValue()));
  protected readonly liveAnnounceLevel = signal<'warning' | 'critical' | null>(null);

  protected readonly progressColor = computed(() =>
    resolveStatusIndicatorColor(this.statusType(), this.displayValue(), this.thresholds()),
  );

  protected readonly alertLevel = computed(() => {
    const bounds = getThresholdsForStatusType(this.statusType(), this.thresholds());

    if (!bounds) {
      return null;
    }

    return getStatusIndicatorLevel(this.displayValue(), bounds.warning, bounds.critical);
  });

  public constructor() {
    effect(() => {
      const nextLevel = this.alertLevel();
      const previousLevel = this.previousAlertLevel;

      this.previousAlertLevel = nextLevel;

      if (previousLevel === undefined) {
        return;
      }

      if (nextLevel === 'critical' && previousLevel !== 'critical') {
        this.liveAnnounceLevel.set('critical');

        return;
      }

      if (nextLevel === 'warning' && previousLevel !== 'warning' && previousLevel !== 'critical') {
        this.liveAnnounceLevel.set('warning');
      }
    });
  }
}
