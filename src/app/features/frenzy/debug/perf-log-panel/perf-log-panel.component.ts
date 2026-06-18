import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { DebugSettingsStore } from '../debug-settings.store';
import type { CaptureMode, PerfExportDestination, PerfExportFormat } from '../debug-settings.store';
import type { PerfMetricsSnapshot } from '../perf-metrics';
import { PerfSampleStore } from '../perf-sample.store';

/**
 * `?debug=perf` perf-log control surface: capture (manual button or auto on a timer), configure (capture cadence,
 * export format + destination, run label), and review the captured samples in a small table for on-device A/B —
 * the way tablet measurements come back to the developer. Reads its frame snapshot via input (no scene-guts inject,
 * ADR 0004 §5); state/persistence lives in `PerfSampleStore`/`DebugSettingsStore`. Dev-only, rendered under the
 * master gate. Plain controls, no Taiga/i18n — like the sibling debug panels.
 */
@Component({
  selector: 'left-paw-perf-log-panel',
  templateUrl: './perf-log-panel.component.html',
  styleUrl: './perf-log-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfLogPanelComponent {
  // This frame's metric snapshot, fed from the scene (same source as the readout). Null until the first frame.
  public readonly snapshot = input<PerfMetricsSnapshot | null>(null);

  protected readonly sampleStore = inject(PerfSampleStore);
  protected readonly settings = inject(DebugSettingsStore);
  // Exported text for the `textarea` destination (manual copy on a tablet); empty when another destination is used.
  protected readonly exportedText = signal('');

  public constructor() {
    // Auto-capture: while the mode is `auto`, sample on the configured interval. The effect re-runs (clearing the old
    // timer) whenever the mode or interval changes, and is torn down with the component.
    effect((onCleanup) => {
      const config = this.settings.perfLog();

      if (config.captureMode === 'auto') {
        const intervalId = setInterval(() => this.capture(), config.captureIntervalSeconds * 1000);

        onCleanup(() => clearInterval(intervalId));
      }
    });
  }

  protected capture(): void {
    const snapshot = this.snapshot();

    if (snapshot !== null) {
      this.sampleStore.capture(snapshot, Date.now());
    }
  }

  protected clear(): void {
    this.sampleStore.clear();
    this.exportedText.set('');
  }

  protected exportLog(): void {
    const text = this.sampleStore.exportText();
    const destination = this.settings.perfLog().exportDestination;

    if (destination === 'textarea') {
      this.exportedText.set(text);
    } else if (destination === 'clipboard') {
      this.exportedText.set('');
      void navigator.clipboard?.writeText(text);
    } else {
      this.exportedText.set('');
      this.download(text);
    }
  }

  protected onLabel(event: Event): void {
    this.settings.updatePerfLog({ label: (event.target as HTMLInputElement).value });
  }

  protected onIntervalSeconds(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value) && value > 0) {
      this.settings.updatePerfLog({ captureIntervalSeconds: value });
    }
  }

  protected onMode(event: Event): void {
    this.settings.updatePerfLog({
      captureMode: (event.target as HTMLSelectElement).value as CaptureMode,
    });
  }

  protected onFormat(event: Event): void {
    this.settings.updatePerfLog({
      exportFormat: (event.target as HTMLSelectElement).value as PerfExportFormat,
    });
  }

  protected onDestination(event: Event): void {
    this.settings.updatePerfLog({
      exportDestination: (event.target as HTMLSelectElement).value as PerfExportDestination,
    });
  }

  private download(text: string): void {
    const isCsv = this.settings.perfLog().exportFormat === 'csv';
    const blob = new Blob([text], { type: isCsv ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `frenzy-perf-log.${isCsv ? 'csv' : 'json'}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
