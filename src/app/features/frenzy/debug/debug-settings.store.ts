import { Injectable, signal } from '@angular/core';

// Every perf metric the readout can show; the store toggles each independently. This list is the single source of
// truth for the metric set — a future metric is added here and keyed off everywhere. Order is the display order.
export const PERF_METRIC_KEYS = [
  'fps',
  'fpsP50',
  'fpsP1',
  'jank',
  'jitter',
  'sceneLoopMs',
  'actorCensus',
  'writeSkip',
  'restructures',
  'gap',
  'staleness',
] as const;

export type PerfMetricKey = (typeof PERF_METRIC_KEYS)[number];

// How perf samples are captured into the persistent log (slice 09): on a button press or automatically on a timer.
export type CaptureMode = 'manual' | 'auto';
// Serialisation of an exported perf log.
export type PerfExportFormat = 'json-compact' | 'json-pretty' | 'csv';
// Where an exported perf log is delivered on the tablet.
export type PerfExportDestination = 'clipboard' | 'textarea' | 'download';

// Runtime config for the persistent perf-log (consumed by slice 09). Held here so the capture cadence and the export
// channel survive reloads/rebuilds — the point of on-device A/B across builds.
export interface PerfLogConfig {
  captureMode: CaptureMode;
  captureIntervalSeconds: number;
  exportFormat: PerfExportFormat;
  exportDestination: PerfExportDestination;
  cap: number;
  label: string;
}

// The full persisted debug-perf settings: a visibility toggle per metric plus the perf-log config.
export interface DebugSettings {
  metrics: Record<PerfMetricKey, boolean>;
  perfLog: PerfLogConfig;
}

const STORAGE_KEY = 'frenzy:debug-settings';

const CAPTURE_MODES: readonly CaptureMode[] = ['manual', 'auto'];
const EXPORT_FORMATS: readonly PerfExportFormat[] = ['json-compact', 'json-pretty', 'csv'];
const EXPORT_DESTINATIONS: readonly PerfExportDestination[] = ['clipboard', 'textarea', 'download'];

function defaultMetrics(): Record<PerfMetricKey, boolean> {
  // Every metric on by default — a reasonable starting readout; the user toggles off the noise.
  return Object.fromEntries(PERF_METRIC_KEYS.map((key) => [key, true])) as Record<
    PerfMetricKey,
    boolean
  >;
}

function defaultPerfLog(): PerfLogConfig {
  return {
    captureMode: 'manual',
    captureIntervalSeconds: 10,
    exportFormat: 'json-pretty',
    exportDestination: 'clipboard',
    cap: 50,
    label: '',
  };
}

function defaultSettings(): DebugSettings {
  return { metrics: defaultMetrics(), perfLog: defaultPerfLog() };
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function coerceMetrics(
  raw: unknown,
  fallback: Record<PerfMetricKey, boolean>,
): Record<PerfMetricKey, boolean> {
  if (typeof raw !== 'object' || raw === null) {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const metrics = { ...fallback };

  for (const key of PERF_METRIC_KEYS) {
    const value = source[key];

    if (typeof value === 'boolean') {
      metrics[key] = value;
    }
  }

  return metrics;
}

function coercePerfLog(raw: unknown, fallback: PerfLogConfig): PerfLogConfig {
  if (typeof raw !== 'object' || raw === null) {
    return fallback;
  }

  const source = raw as Record<string, unknown>;

  return {
    captureMode: oneOf(source['captureMode'], CAPTURE_MODES, fallback.captureMode),
    captureIntervalSeconds: positiveNumber(
      source['captureIntervalSeconds'],
      fallback.captureIntervalSeconds,
    ),
    exportFormat: oneOf(source['exportFormat'], EXPORT_FORMATS, fallback.exportFormat),
    exportDestination: oneOf(
      source['exportDestination'],
      EXPORT_DESTINATIONS,
      fallback.exportDestination,
    ),
    cap: positiveNumber(source['cap'], fallback.cap),
    label: typeof source['label'] === 'string' ? source['label'] : fallback.label,
  };
}

// Defensively rebuild settings from an unknown parsed blob: each field is taken only when present and well-typed,
// else the default for that field stands. An old, partial, or garbage blob never yields an invalid state — corruption
// degrades to defaults field-by-field rather than throwing.
function coerceSettings(raw: unknown): DebugSettings {
  const defaults = defaultSettings();

  if (typeof raw !== 'object' || raw === null) {
    return defaults;
  }

  const source = raw as Record<string, unknown>;

  return {
    metrics: coerceMetrics(source['metrics'], defaults.metrics),
    perfLog: coercePerfLog(source['perfLog'], defaults.perfLog),
  };
}

function readStored(): DebugSettings {
  if (typeof localStorage === 'undefined') {
    return defaultSettings();
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    return defaultSettings();
  }

  try {
    return coerceSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

/**
 * Single source of truth for runtime debug-perf settings: a visibility toggle per metric and the perf-log config,
 * persisted to localStorage (`frenzy:debug-settings`) so choices survive reloads and rebuilds (the basis for on-device
 * A/B across builds). Modelled on `SoundSettingsService` — plain signals plus write-through persistence.
 *
 * The master `?debug` gate is enforced where this store is *provided* (only under debug), not inside it: a real player
 * never instantiates it, so it costs nothing in normal play. A corrupt or partial stored blob degrades to defaults
 * field-by-field rather than throwing.
 */
@Injectable()
export class DebugSettingsStore {
  private readonly _metrics = signal<Record<PerfMetricKey, boolean>>(defaultMetrics());
  private readonly _perfLog = signal<PerfLogConfig>(defaultPerfLog());

  public readonly metrics = this._metrics.asReadonly();
  public readonly perfLog = this._perfLog.asReadonly();

  public constructor() {
    const stored = readStored();

    this._metrics.set(stored.metrics);
    this._perfLog.set(stored.perfLog);
  }

  public setMetric(key: PerfMetricKey, value: boolean): void {
    this._metrics.update((metrics) => ({ ...metrics, [key]: value }));
    this.persist();
  }

  public toggleMetric(key: PerfMetricKey): void {
    this.setMetric(key, !this._metrics()[key]);
  }

  public updatePerfLog(changes: Partial<PerfLogConfig>): void {
    this._perfLog.update((config) => ({ ...config, ...changes }));
    this.persist();
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const settings: DebugSettings = { metrics: this._metrics(), perfLog: this._perfLog() };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}
