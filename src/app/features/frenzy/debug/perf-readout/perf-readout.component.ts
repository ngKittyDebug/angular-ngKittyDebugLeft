import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';

import { COLLAPSE_KEY, persistedCollapse } from '../../ui/persisted-collapse';
import { DebugSettingsStore } from '../debug-settings.store';
import type { PerfMetricKey } from '../debug-settings.store';
import { PerfMetricInfoComponent } from '../perf-metric-info/perf-metric-info.component';
import { perfReadoutRows } from '../perf-metrics';
import type { PerfMetricsSnapshot } from '../perf-metrics';

/**
 * `?debug=perf` readout: a screen-space corner panel that lists every perf metric (FPS family, jank/jitter, scene-loop
 * ms, the actor census, the write/skip + restructure counters, and own-sprite gap/staleness) and carries each metric's
 * own toggle and info affordance on its row — so the readout is both the display and the per-metric control surface.
 *
 * Renders the rows derived from the `snapshot` input and the `DebugSettingsStore` toggles (the rAF loop and the
 * accumulation live in the scene's render loop + `PerfMetricsService`). An off metric stays as a dimmed row showing
 * «—» rather than disappearing. Labels and the per-metric info hints come from the lazy `frenzy-debug` i18n scope. The
 * panel keeps at most one info hint open at a time (`openKey`). Dressed in the shared theme-aware HUD-panel chrome;
 * collapse state persists per-panel but, unlike the leaderboard/legend, it does NOT close on an outside click — it is
 * a live watch panel. Rendered only under the master gate (see the scene template `@if`), so it costs nothing in play.
 */
@Component({
  selector: 'left-paw-perf-readout',
  imports: [TranslocoDirective, TuiIcon, PerfMetricInfoComponent],
  templateUrl: './perf-readout.component.html',
  styleUrl: './perf-readout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The metric-info hint is transient: dismiss it on a click outside any trigger/hint, and whenever the player leaves
  // the game (window blur or the tab being hidden — e.g. the fainted screen), so it never lingers over the scene.
  host: {
    '(document:click)': 'onInfoOutsideClick($event)',
    '(window:blur)': 'closeInfo()',
    '(document:visibilitychange)': 'onVisibilityChange($event)',
  },
})
export class PerfReadoutComponent {
  // The latest metric snapshot (throttled to ~5Hz by the PerfMetricsService); null until the first frame.
  public readonly snapshot = input<PerfMetricsSnapshot | null>(null);

  protected readonly store = inject(DebugSettingsStore);
  // One line per metric, in canonical order — recomputes when the snapshot or any toggle changes.
  protected readonly rowList = computed(() =>
    perfReadoutRows(this.snapshot(), this.store.metrics()),
  );
  // The collapsed-pill glance: the current (rounded) FPS, or «—» before the first frame.
  protected readonly fpsText = computed(() => {
    const snapshot = this.snapshot();

    return snapshot === null ? '—' : `${Math.round(snapshot.fps)}`;
  });
  // Persisted per-panel collapse, collapsed by default. No outside-click handler: a live watch panel must stay open
  // while the developer taps around the scene.
  protected readonly collapsed = persistedCollapse(COLLAPSE_KEY.perfReadout, () => true);
  // Which metric's info hint is currently open — at most one at a time.
  protected readonly openKey = signal<PerfMetricKey | null>(null);

  protected toggle(): void {
    this.collapsed.update((value) => !value);
    this.closeInfo();
  }

  protected onInfoToggled(key: PerfMetricKey): void {
    this.openKey.update((current) => (current === key ? null : key));
  }

  protected closeInfo(): void {
    this.openKey.set(null);
  }

  // Close the open hint on a click that is neither an info trigger (its own toggle handles that) nor inside the hint
  // bubble — including a tap on the fainted screen / anywhere off the panel.
  protected onInfoOutsideClick(event: Event): void {
    if (this.openKey() === null) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (target?.closest('.perf-metric-info') || target?.closest('.perf-metric-info__hint')) {
      return;
    }

    this.closeInfo();
  }

  protected onVisibilityChange(event: Event): void {
    if ((event.target as Document | null)?.visibilityState === 'hidden') {
      this.closeInfo();
    }
  }
}
