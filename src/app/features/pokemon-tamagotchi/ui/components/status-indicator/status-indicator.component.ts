import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHint } from '@taiga-ui/core';
import { TuiBadge, TuiProgressBar } from '@taiga-ui/kit';
import { STATUS_THRESHOLDS } from '../../../data/constants/status-thresholds.constants';
import {
  getStatusIndicatorLevel,
  getThresholdsForStatusType,
  resolveStatusIndicatorColor,
} from '../../../data/helpers/status-indicator.helper';
import type { StatusThresholds, StatusType } from '../../../models/pokemon-status.model';

@Component({
  selector: 'left-paw-status-indicator',
  imports: [TranslocoDirective, TuiBadge, TuiHint, TuiProgressBar],
  templateUrl: './status-indicator.component.html',
  styleUrl: './status-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusIndicatorComponent {
  public readonly currentValue = input.required<number>();
  public readonly maxValue = input<number>(100);
  public readonly statusType = input.required<StatusType>();
  public readonly thresholds = input<StatusThresholds>(STATUS_THRESHOLDS);
  public readonly level = input<number | null>(null);

  protected readonly progressColor = computed(() =>
    resolveStatusIndicatorColor(this.statusType(), this.currentValue(), this.thresholds()),
  );

  protected readonly alertLevel = computed(() => {
    const bounds = getThresholdsForStatusType(this.statusType(), this.thresholds());

    if (!bounds) {
      return null;
    }

    return getStatusIndicatorLevel(this.currentValue(), bounds.warning, bounds.critical);
  });

  protected readonly percentage = computed(() => {
    const max = this.maxValue();

    if (max <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.currentValue() / max) * 100));
  });
}
