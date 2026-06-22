import type { PerfMetricKey } from './debug-settings.store';
import { PERF_METRIC_KEYS } from './debug-settings.store';

// A frame slower than this (the 30fps floor) counts as jank — the readout's "% of frames that stuttered".
export const JANK_THRESHOLD_MS = 1000 / 30;
// Frames kept for the windowed distribution stats (~3s at 60fps) — enough that the slowest-1% bucket has samples.
export const PERF_WINDOW_SIZE = 180;

// Per-metric tone for the readout colour: `ok` keeps the default blue, `warn` goes amber, `bad` goes red.
export type MetricTone = 'ok' | 'warn' | 'bad';

// Windowed frame-timing distribution. The floor (p1/jank) matters more than the average on a weak tablet, so the
// readout leads with these rather than a single mean FPS.
export interface FrameTimingStats {
  p50Fps: number;
  p1Fps: number;
  jankPercent: number;
  jitterMs: number;
}

// Per-frame actor accounting from the registry's cull decision: how many drifting items exist, how many got a DOM
// write this frame vs were soft-culled off-screen, and the live player count.
export interface ActorCensus {
  itemsTotal: number;
  itemsWritten: number;
  itemsSkipped: number;
  players: number;
}

// Everything the perf subsystem measures in a frame, emitted as one signal value (throttled to ~5Hz so the readout
// stays legible). The readout renders only the metrics whose toggle is on; the perf-log samples the same shape.
export interface PerfMetricsSnapshot {
  fps: number;
  p50Fps: number;
  p1Fps: number;
  jankPercent: number;
  jitterMs: number;
  sceneLoopMs: number;
  census: ActorCensus;
  writesPerFrame: number;
  skipsPerFrame: number;
  restructuresPerSecond: number;
  // gap/staleness are -1 (rendered as —) until my own sprite exists.
  gapPx: number;
  stalenessMs: number;
}

// One readout line: the metric key, whether its toggle is on, a preformatted value, and its colour tone. A row is
// emitted for every metric (enabled or not) — the view dims a disabled row and shows «—» for it rather than dropping it.
export interface PerfReadoutRow {
  key: PerfMetricKey;
  enabled: boolean;
  text: string;
  tone: MetricTone;
}

// Higher-is-better tones (FPS family): a non-positive value is startup/no-data → neutral, not "bad".
const FPS_WARN = 50;
const FPS_BAD = 30;
// Lower-is-better tones. gap in world px (tens of px is a visible overshoot); staleness in ms (~300ms snapshot cadence,
// so ~500ms is normal jitter); jank% / jitter / loop-ms light up only on real degradation.
const GAP_WARN_PX = 20;
const GAP_BAD_PX = 50;
const STALE_WARN_MS = 500;
const STALE_BAD_MS = 1000;
const JANK_WARN_PERCENT = 5;
const JANK_BAD_PERCENT = 15;
const JITTER_WARN_MS = 4;
const JITTER_BAD_MS = 8;
const LOOP_WARN_MS = 8;
const LOOP_BAD_MS = 12;

function toneAbove(value: number, warn: number, bad: number): MetricTone {
  if (value <= 0) {
    return 'ok';
  }

  if (value < bad) {
    return 'bad';
  }

  return value < warn ? 'warn' : 'ok';
}

function toneBelow(value: number, warn: number, bad: number): MetricTone {
  if (value < 0) {
    return 'ok';
  }

  if (value > bad) {
    return 'bad';
  }

  return value > warn ? 'warn' : 'ok';
}

// Append to a fixed-size window, dropping the oldest once full. Returns a new array (pure).
export function pushCapped<T>(buffer: readonly T[], value: T, max: number): T[] {
  const next = [...buffer, value];

  return next.length > max ? next.slice(next.length - max) : next;
}

// EMA-smoothed FPS from the previous EMA and this frame's interval. A zero previous seeds with the instant FPS; a
// non-positive or pause-length (>=1s) interval is ignored, exactly as the old per-frame sampler did.
export function nextEmaFps(previousEma: number, intervalMs: number): number {
  if (intervalMs <= 0 || intervalMs >= 1000) {
    return previousEma;
  }

  const instant = 1000 / intervalMs;

  return previousEma === 0 ? instant : previousEma * 0.85 + instant * 0.15;
}

// Distribution stats over a window of frame intervals (ms). Garbage/empty samples are dropped; an empty window yields
// zeros (startup), not NaN.
export function frameTimingStats(intervalsMs: readonly number[]): FrameTimingStats {
  const valid = intervalsMs.filter((ms) => ms > 0 && Number.isFinite(ms));

  if (valid.length === 0) {
    return { p50Fps: 0, p1Fps: 0, jankPercent: 0, jitterMs: 0 };
  }

  const sorted = [...valid].sort((first, second) => first - second);
  const median = sorted[Math.floor(sorted.length / 2)];
  const lowCount = Math.max(1, Math.floor(valid.length * 0.01));
  const slowest = sorted.slice(sorted.length - lowCount);
  const slowMean = slowest.reduce((sum, ms) => sum + ms, 0) / slowest.length;
  const jankCount = valid.filter((ms) => ms > JANK_THRESHOLD_MS).length;
  const mean = valid.reduce((sum, ms) => sum + ms, 0) / valid.length;
  const variance = valid.reduce((sum, ms) => sum + (ms - mean) ** 2, 0) / valid.length;

  return {
    p50Fps: 1000 / median,
    p1Fps: 1000 / slowMean,
    jankPercent: (jankCount / valid.length) * 100,
    jitterMs: Math.sqrt(variance),
  };
}

// Own-sprite prediction gap: the world-px distance between the authoritative and rendered (client-predicted)
// positions, both normalized 0..1.
export function predictionGapPx(
  authoritative: { x: number; y: number },
  rendered: { x: number; y: number },
  worldWidth: number,
  worldHeight: number,
): number {
  return Math.hypot(
    (rendered.x - authoritative.x) * worldWidth,
    (rendered.y - authoritative.y) * worldHeight,
  );
}

// Per-metric value formatters. A `Record` (not a switch) so adding a metric to `PerfMetricKey` fails to compile until
// it has a formatter here — compile-time exhaustiveness, like the client's other per-key tables.
const METRIC_TEXT: Record<PerfMetricKey, (metrics: PerfMetricsSnapshot) => string> = {
  fps: (metrics) => `${Math.round(metrics.fps)}`,
  fpsP50: (metrics) => `${Math.round(metrics.p50Fps)}`,
  fpsP1: (metrics) => `${Math.round(metrics.p1Fps)}`,
  jank: (metrics) => `${Math.round(metrics.jankPercent)}%`,
  jitter: (metrics) => `${metrics.jitterMs.toFixed(1)}ms`,
  sceneLoopMs: (metrics) => `${metrics.sceneLoopMs.toFixed(1)}ms`,
  actorCensus: (metrics) => `${metrics.census.itemsTotal}i ${metrics.census.players}p`,
  writeSkip: (metrics) => `${metrics.writesPerFrame}/${metrics.skipsPerFrame}`,
  restructures: (metrics) => `${metrics.restructuresPerSecond}/s`,
  gap: (metrics) => (metrics.gapPx < 0 ? '—' : `${Math.round(metrics.gapPx)}px`),
  staleness: (metrics) => (metrics.stalenessMs < 0 ? '—' : `${Math.round(metrics.stalenessMs)}ms`),
};

// Per-metric colour tone. The informational counters carry no health threshold (always `ok`).
const METRIC_TONE: Record<PerfMetricKey, (metrics: PerfMetricsSnapshot) => MetricTone> = {
  fps: (metrics) => toneAbove(metrics.fps, FPS_WARN, FPS_BAD),
  fpsP50: (metrics) => toneAbove(metrics.p50Fps, FPS_WARN, FPS_BAD),
  fpsP1: (metrics) => toneAbove(metrics.p1Fps, FPS_WARN, FPS_BAD),
  jank: (metrics) => toneBelow(metrics.jankPercent, JANK_WARN_PERCENT, JANK_BAD_PERCENT),
  jitter: (metrics) => toneBelow(metrics.jitterMs, JITTER_WARN_MS, JITTER_BAD_MS),
  sceneLoopMs: (metrics) => toneBelow(metrics.sceneLoopMs, LOOP_WARN_MS, LOOP_BAD_MS),
  actorCensus: () => 'ok',
  writeSkip: () => 'ok',
  restructures: () => 'ok',
  gap: (metrics) => toneBelow(metrics.gapPx, GAP_WARN_PX, GAP_BAD_PX),
  staleness: (metrics) => toneBelow(metrics.stalenessMs, STALE_WARN_MS, STALE_BAD_MS),
};

// Project a snapshot into the readout lines — one per metric, in the canonical metric order, each flagged with its
// toggle state (no longer filtered). A null snapshot (before the first frame, or perf off) yields no rows; the view
// renders a disabled row dimmed with «—» rather than dropping it.
export function perfReadoutRows(
  metrics: PerfMetricsSnapshot | null,
  enabled: Record<PerfMetricKey, boolean>,
): readonly PerfReadoutRow[] {
  if (metrics === null) {
    return [];
  }

  return PERF_METRIC_KEYS.map((key) => ({
    key,
    enabled: enabled[key],
    text: METRIC_TEXT[key](metrics),
    tone: METRIC_TONE[key](metrics),
  }));
}
