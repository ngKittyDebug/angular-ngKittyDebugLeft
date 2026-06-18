import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { METRIC_LABELS } from '../perf-metrics';
import { DebugSettingsStore, PERF_METRIC_KEYS } from '../debug-settings.store';

/**
 * `?debug=perf` configurator: the single runtime control surface for the perf subsystem — one checkbox per metric,
 * toggling its visibility in the readout. State lives in (and persists through) `DebugSettingsStore`. Dev-only and
 * gated behind the master `?debug=perf` flag (rendered under the scene template `@if`), so it never instantiates the
 * store for a real player. Plain checkboxes + hardcoded labels, like the sibling debug panels (not product UI).
 */
@Component({
  selector: 'left-paw-debug-configurator',
  templateUrl: './debug-configurator.component.html',
  styleUrl: './debug-configurator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugConfiguratorComponent {
  protected readonly store = inject(DebugSettingsStore);
  protected readonly keys = PERF_METRIC_KEYS;
  protected readonly labels = METRIC_LABELS;
}
