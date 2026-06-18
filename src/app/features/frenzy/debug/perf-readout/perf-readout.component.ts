import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { DebugSettingsStore } from '../debug-settings.store';
import { perfReadoutRows } from '../perf-metrics';
import type { PerfMetricsSnapshot } from '../perf-metrics';

/**
 * `?debug=perf` readout: a screen-space corner panel listing the currently-enabled perf metrics (FPS family, jank/
 * jitter, scene-loop ms, the actor census, the write/skip + restructure counters, and own-sprite gap/staleness).
 *
 * Pure presentation: it renders the rows derived from the `snapshot` input and the `DebugSettingsStore` toggles —
 * the rAF loop and the accumulation live in the scene's render loop + `PerfMetricsService`. Turning a metric off in
 * the configurator drops its line here. Rendered only under the master gate (see the scene template `@if`), so it
 * costs nothing in normal play. Non-interactive, aria-hidden — a real-time visual-only aid.
 */
@Component({
  selector: 'left-paw-perf-readout',
  templateUrl: './perf-readout.component.html',
  styleUrl: './perf-readout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfReadoutComponent {
  private readonly store = inject(DebugSettingsStore);

  // The latest metric snapshot (throttled to ~5Hz by the PerfMetricsService); null until the first frame.
  public readonly snapshot = input<PerfMetricsSnapshot | null>(null);

  // One line per enabled metric, in canonical order — recomputes when the snapshot or any toggle changes.
  protected readonly rows = computed(() => perfReadoutRows(this.snapshot(), this.store.metrics()));
}
