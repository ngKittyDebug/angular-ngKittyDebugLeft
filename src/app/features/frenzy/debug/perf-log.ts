import type { PerfExportFormat, PerfMetricKey } from './debug-settings.store';
import { PERF_METRIC_KEYS } from './debug-settings.store';
import type { PerfMetricsSnapshot } from './perf-metrics';

/**
 * One persisted perf sample — the stable export/import contract. `label` tags the run (lever/build under test),
 * `build` distinguishes dev vs prod, `device` carries UA/screen/DPR (so a tablet sample is identifiable), `timestamp`
 * is passed in by the caller, and `metrics` is the flat column→value map for the metrics enabled at capture time.
 */
export interface PerfSample {
  label: string;
  build: string;
  device: string;
  timestamp: number;
  metrics: Record<string, number>;
}

// Each metric's flat column projection from a snapshot. Composite metrics (census, write/skip) expand to several
// scalar columns so the export is spreadsheet-friendly and the contract is flat. A `Record` keyed by `PerfMetricKey`
// → compile-time exhaustiveness (a new metric must project here).
const METRIC_COLUMNS: Record<
  PerfMetricKey,
  (snapshot: PerfMetricsSnapshot) => Record<string, number>
> = {
  fps: (snapshot) => ({ fps: snapshot.fps }),
  fpsP50: (snapshot) => ({ p50Fps: snapshot.p50Fps }),
  fpsP1: (snapshot) => ({ p1Fps: snapshot.p1Fps }),
  jank: (snapshot) => ({ jankPercent: snapshot.jankPercent }),
  jitter: (snapshot) => ({ jitterMs: snapshot.jitterMs }),
  sceneLoopMs: (snapshot) => ({ sceneLoopMs: snapshot.sceneLoopMs }),
  actorCensus: (snapshot) => ({
    itemsTotal: snapshot.census.itemsTotal,
    itemsWritten: snapshot.census.itemsWritten,
    itemsSkipped: snapshot.census.itemsSkipped,
    players: snapshot.census.players,
  }),
  writeSkip: (snapshot) => ({
    writesPerFrame: snapshot.writesPerFrame,
    skipsPerFrame: snapshot.skipsPerFrame,
  }),
  restructures: (snapshot) => ({ restructuresPerSecond: snapshot.restructuresPerSecond }),
  gap: (snapshot) => ({ gapPx: snapshot.gapPx }),
  staleness: (snapshot) => ({ stalenessMs: snapshot.stalenessMs }),
};

const ZERO_SNAPSHOT: PerfMetricsSnapshot = {
  fps: 0,
  p50Fps: 0,
  p1Fps: 0,
  jankPercent: 0,
  jitterMs: 0,
  sceneLoopMs: 0,
  census: { itemsTotal: 0, itemsWritten: 0, itemsSkipped: 0, players: 0 },
  writesPerFrame: 0,
  skipsPerFrame: 0,
  restructuresPerSecond: 0,
  gapPx: 0,
  stalenessMs: 0,
};

// The full ordered set of flat metric columns — the stable CSV column order. Derived from `METRIC_COLUMNS` so it can
// never drift from the projections above.
export const SAMPLE_COLUMNS: readonly string[] = PERF_METRIC_KEYS.flatMap((key) =>
  Object.keys(METRIC_COLUMNS[key](ZERO_SNAPSHOT)),
);

const META_COLUMNS: readonly string[] = ['label', 'build', 'device', 'timestamp'];

// Project a snapshot into the flat column→value map for the enabled metrics only (the configurable sample
// composition), rounding to two decimals for a clean, deterministic contract.
export function sampleMetrics(
  snapshot: PerfMetricsSnapshot,
  enabled: Record<PerfMetricKey, boolean>,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const key of PERF_METRIC_KEYS) {
    if (!enabled[key]) {
      continue;
    }

    for (const [column, value] of Object.entries(METRIC_COLUMNS[key](snapshot))) {
      result[column] = Math.round(value * 100) / 100;
    }
  }

  return result;
}

function csvCell(value: string | number): string {
  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(samples: readonly PerfSample[]): string {
  const header = [...META_COLUMNS, ...SAMPLE_COLUMNS];
  const rows = samples.map((sample) =>
    [
      sample.label,
      sample.build,
      sample.device,
      sample.timestamp,
      ...SAMPLE_COLUMNS.map((column) => sample.metrics[column] ?? ''),
    ]
      .map(csvCell)
      .join(','),
  );

  return [header.map(csvCell).join(','), ...rows].join('\n');
}

// Serialize the log to the chosen export format. JSON variants round-trip through `parseSamples`; CSV is export-only
// (for a spreadsheet), with the stable column order above.
export function serializeSamples(samples: readonly PerfSample[], format: PerfExportFormat): string {
  if (format === 'csv') {
    return toCsv(samples);
  }

  return JSON.stringify(samples, null, format === 'json-pretty' ? 2 : undefined);
}

function isPerfSample(value: unknown): value is PerfSample {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['label'] === 'string' &&
    typeof record['build'] === 'string' &&
    typeof record['device'] === 'string' &&
    typeof record['timestamp'] === 'number' &&
    typeof record['metrics'] === 'object' &&
    record['metrics'] !== null
  );
}

// Parse a persisted/exported JSON log back to samples, dropping anything malformed (corrupt localStorage degrades to
// an empty log rather than throwing). Well-formed samples pass through unchanged, so `parseSamples(serializeSamples(
// x, 'json-compact'))` deep-equals `x`.
export function parseSamples(raw: string): PerfSample[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isPerfSample);
}
