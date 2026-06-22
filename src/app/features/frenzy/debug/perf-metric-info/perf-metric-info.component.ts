import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHint, TuiIcon } from '@taiga-ui/core';

import type { PerfMetricKey } from '../debug-settings.store';

/**
 * Per-metric info affordance for the perf readout: an `@tui.info` icon that, on tap, opens a manual Taiga hint with
 * the metric's structured explanation (what it tracks / why it matters / how to read it), localized via the lazy
 * `frenzy-debug` scope. Touch-first — the hint is click-controlled (no hover), and the readout keeps one open at a
 * time via the `open` input. Presentational: it owns no state, it just emits `toggled` for the readout to act on.
 */
@Component({
  selector: 'left-paw-perf-metric-info',
  imports: [TranslocoDirective, TuiHint, TuiIcon],
  templateUrl: './perf-metric-info.component.html',
  styleUrl: './perf-metric-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfMetricInfoComponent {
  // Which metric this affordance explains (drives the i18n keys).
  public readonly key = input.required<PerfMetricKey>();
  // Whether this metric's hint is currently open — the readout keeps one open at a time.
  public readonly open = input<boolean>(false);
  // Tapped — the readout flips/clears its open metric.
  public readonly toggled = output<void>();

  protected onToggle(): void {
    this.toggled.emit();
  }
}
