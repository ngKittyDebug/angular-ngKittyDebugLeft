import { inject, Injectable, signal } from '@angular/core';

import { environment } from '@environments/environment';

import { DebugSettingsStore } from './debug-settings.store';
import { parseSamples, sampleMetrics, serializeSamples } from './perf-log';
import type { PerfSample } from './perf-log';
import type { PerfMetricsSnapshot } from './perf-metrics';
import { pushCapped } from './perf-metrics';

const STORAGE_KEY = 'frenzy:perf-log';

/**
 * The persistent perf-log: captures a `PerfSample` from a metric snapshot and keeps a capped, localStorage-backed list
 * (`frenzy:perf-log`) so measurements taken on a tablet survive reloads and come back to the developer for A/B across
 * builds. The capture composition (which metrics), the cap and the export format all come from `DebugSettingsStore`.
 *
 * A dev tool, NOT telemetry: it never sends anything to a server — the only egress is the manual `exportText`. Like the
 * rest of the perf subsystem it is provided in the scene but injected only under `?debug=perf` (by the gated panel), so
 * a real player never instantiates it. The timestamp is passed in by the caller (kept out of here for testability).
 */
@Injectable()
export class PerfSampleStore {
  private readonly settings = inject(DebugSettingsStore);
  private readonly _samples = signal<readonly PerfSample[]>(readStored());

  public readonly samples = this._samples.asReadonly();

  // Append a sample built from the snapshot (metrics filtered to the enabled set), capped to the configured size.
  public capture(snapshot: PerfMetricsSnapshot, timestamp: number): void {
    const config = this.settings.perfLog();
    const sample: PerfSample = {
      label: resolveLabel(config.label),
      build: environment.production ? 'prod' : 'dev',
      device: readDevice(),
      timestamp,
      metrics: sampleMetrics(snapshot, this.settings.metrics()),
    };

    this._samples.update((samples) => pushCapped(samples, sample, config.cap));
    this.persist();
  }

  public clear(): void {
    this._samples.set([]);
    this.persist();
  }

  // The log serialized to the configured export format — the text the panel routes to clipboard/textarea/download.
  public exportText(): string {
    return serializeSamples(this._samples(), this.settings.perfLog().exportFormat);
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._samples()));
  }
}

function readStored(): readonly PerfSample[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  return raw === null ? [] : parseSamples(raw);
}

// Label precedence: the panel field wins; otherwise the `?perf-label=` query param (handy for stamping a build on a
// tablet without typing); otherwise empty.
function resolveLabel(panelLabel: string): string {
  if (panelLabel.length > 0) {
    return panelLabel;
  }

  if (typeof location === 'undefined') {
    return '';
  }

  return new URLSearchParams(location.search).get('perf-label') ?? '';
}

function readDevice(): string {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const width = typeof screen === 'undefined' ? 0 : screen.width;
  const height = typeof screen === 'undefined' ? 0 : screen.height;
  const pixelRatio = typeof devicePixelRatio === 'undefined' ? 1 : devicePixelRatio;

  return `${navigator.userAgent} ${width}x${height}@${pixelRatio}`;
}
