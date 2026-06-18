import { describe, expect, it } from 'vitest';

import {
  frameTimingStats,
  JANK_THRESHOLD_MS,
  METRIC_LABELS,
  nextEmaFps,
  perfReadoutRows,
  predictionGapPx,
  pushCapped,
} from './perf-metrics';
import type { PerfMetricsSnapshot } from './perf-metrics';
import { PERF_METRIC_KEYS } from './debug-settings.store';
import type { PerfMetricKey } from './debug-settings.store';

function allEnabled(): Record<PerfMetricKey, boolean> {
  return Object.fromEntries(PERF_METRIC_KEYS.map((key) => [key, true])) as Record<
    PerfMetricKey,
    boolean
  >;
}

function snapshot(overrides: Partial<PerfMetricsSnapshot> = {}): PerfMetricsSnapshot {
  return {
    fps: 60,
    p50Fps: 60,
    p1Fps: 45,
    jankPercent: 0,
    jitterMs: 1,
    sceneLoopMs: 3,
    census: { itemsTotal: 10, itemsWritten: 8, itemsSkipped: 2, players: 4 },
    writesPerFrame: 8,
    skipsPerFrame: 2,
    restructuresPerSecond: 3,
    gapPx: 5,
    stalenessMs: 200,
    ...overrides,
  };
}

describe('pushCapped', () => {
  it('appends while under the cap', () => {
    expect(pushCapped([1, 2], 3, 5)).toEqual([1, 2, 3]);
  });

  it('drops the oldest once over the cap', () => {
    expect(pushCapped([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
});

describe('nextEmaFps', () => {
  it('seeds with the instant FPS when there is no previous EMA', () => {
    expect(nextEmaFps(0, 20)).toBeCloseTo(50, 5);
  });

  it('blends the previous EMA with the instant FPS', () => {
    expect(nextEmaFps(50, 20)).toBeCloseTo(50 * 0.85 + 50 * 0.15, 5);
  });

  it('ignores a non-positive or pause-length interval', () => {
    expect(nextEmaFps(50, 0)).toBe(50);
    expect(nextEmaFps(50, 5000)).toBe(50);
  });
});

describe('frameTimingStats', () => {
  it('returns zeros for an empty window', () => {
    expect(frameTimingStats([])).toEqual({ p50Fps: 0, p1Fps: 0, jankPercent: 0, jitterMs: 0 });
  });

  it('reports a steady frame rate with no jank or jitter', () => {
    const stats = frameTimingStats(Array.from({ length: 100 }, () => 16));

    expect(stats.p50Fps).toBeCloseTo(1000 / 16, 3);
    expect(stats.p1Fps).toBeCloseTo(1000 / 16, 3);
    expect(stats.jankPercent).toBe(0);
    expect(stats.jitterMs).toBeCloseTo(0, 5);
  });

  it('drags the 1%-low and jank% down on a few slow frames', () => {
    const intervals = [...Array.from({ length: 99 }, () => 16), 100];
    const stats = frameTimingStats(intervals);

    expect(stats.p50Fps).toBeCloseTo(1000 / 16, 3);
    expect(stats.p1Fps).toBeCloseTo(10, 3);
    expect(stats.jankPercent).toBeCloseTo(1, 5);
    expect(stats.jitterMs).toBeGreaterThan(0);
  });

  it('treats a frame just over the 30fps floor as jank', () => {
    expect(JANK_THRESHOLD_MS).toBeCloseTo(33.33, 1);
    expect(frameTimingStats([JANK_THRESHOLD_MS + 1]).jankPercent).toBe(100);
    expect(frameTimingStats([JANK_THRESHOLD_MS - 1]).jankPercent).toBe(0);
  });
});

describe('predictionGapPx', () => {
  it('is the world-px distance between authoritative and rendered positions', () => {
    expect(predictionGapPx({ x: 0, y: 0 }, { x: 0.1, y: 0 }, 1000, 500)).toBeCloseTo(100, 5);
    expect(predictionGapPx({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 1000, 500)).toBe(0);
  });
});

describe('perfReadoutRows', () => {
  it('is empty when there is no snapshot yet', () => {
    expect(perfReadoutRows(null, allEnabled())).toEqual([]);
  });

  it('emits one row per enabled metric, in the canonical metric order', () => {
    const rows = perfReadoutRows(snapshot(), allEnabled());

    expect(rows.map((row) => row.key)).toEqual([...PERF_METRIC_KEYS]);
    expect(rows.every((row) => row.label.length > 0 && row.text.length > 0)).toBe(true);
  });

  it('drops a metric whose toggle is off', () => {
    const enabled = { ...allEnabled(), gap: false };
    const rows = perfReadoutRows(snapshot(), enabled);

    expect(rows.some((row) => row.key === 'gap')).toBe(false);
    expect(rows.some((row) => row.key === 'fps')).toBe(true);
  });

  it('flags a degraded reading with a bad tone and keeps a healthy one ok', () => {
    const rows = perfReadoutRows(snapshot({ fps: 12, p50Fps: 60 }), allEnabled());

    expect(rows.find((row) => row.key === 'fps')?.tone).toBe('bad');
    expect(rows.find((row) => row.key === 'fpsP50')?.tone).toBe('ok');
  });

  it('has a label for every metric key', () => {
    for (const key of PERF_METRIC_KEYS) {
      expect(METRIC_LABELS[key].length).toBeGreaterThan(0);
    }
  });
});
