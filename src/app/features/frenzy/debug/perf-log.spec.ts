import { describe, expect, it } from 'vitest';

import { parseSamples, SAMPLE_COLUMNS, sampleMetrics, serializeSamples } from './perf-log';
import type { PerfSample } from './perf-log';
import { PERF_METRIC_KEYS } from './debug-settings.store';
import type { PerfMetricKey } from './debug-settings.store';
import type { PerfMetricsSnapshot } from './perf-metrics';

function snapshot(overrides: Partial<PerfMetricsSnapshot> = {}): PerfMetricsSnapshot {
  return {
    fps: 60,
    p50Fps: 60,
    p1Fps: 45,
    jankPercent: 1,
    jitterMs: 1,
    sceneLoopMs: 3,
    census: { itemsTotal: 12, itemsWritten: 9, itemsSkipped: 3, players: 5 },
    writesPerFrame: 9,
    skipsPerFrame: 3,
    restructuresPerSecond: 3,
    gapPx: 8,
    stalenessMs: 200,
    ...overrides,
  };
}

function allEnabled(): Record<PerfMetricKey, boolean> {
  return Object.fromEntries(PERF_METRIC_KEYS.map((key) => [key, true])) as Record<
    PerfMetricKey,
    boolean
  >;
}

function sample(overrides: Partial<PerfSample> = {}): PerfSample {
  return {
    label: 'lever-c1',
    build: 'dev',
    device: 'jsdom 800x600@2',
    timestamp: 1000,
    metrics: { fps: 60, p1Fps: 45 },
    ...overrides,
  };
}

describe('sampleMetrics', () => {
  it('emits a flat column for every enabled metric, expanding the composite ones', () => {
    const metrics = sampleMetrics(snapshot(), allEnabled());

    for (const column of SAMPLE_COLUMNS) {
      expect(metrics[column]).toBeDefined();
    }

    expect(metrics['itemsTotal']).toBe(12);
    expect(metrics['players']).toBe(5);
    expect(metrics['writesPerFrame']).toBe(9);
  });

  it('drops the columns of disabled metrics', () => {
    const enabled = { ...allEnabled(), gap: false, actorCensus: false };
    const metrics = sampleMetrics(snapshot(), enabled);

    expect(metrics['gapPx']).toBeUndefined();
    expect(metrics['itemsTotal']).toBeUndefined();
    expect(metrics['fps']).toBe(60);
  });

  it('rounds values to two decimals', () => {
    expect(sampleMetrics(snapshot({ fps: 58.736 }), allEnabled())['fps']).toBe(58.74);
  });
});

describe('serializeSamples', () => {
  it('produces compact JSON with no newlines and pretty JSON with indentation', () => {
    const samples = [sample()];

    expect(serializeSamples(samples, 'json-compact')).toBe(JSON.stringify(samples));
    expect(serializeSamples(samples, 'json-pretty')).toContain('\n');
  });

  it('produces a CSV header plus one row per sample, quoting fields with commas', () => {
    const csv = serializeSamples([sample({ device: 'UA, with comma' })], 'csv');
    const lines = csv.split('\n');

    expect(lines[0].startsWith('label,build,device,timestamp,')).toBe(true);
    expect(lines).toHaveLength(2);
    expect(csv).toContain('"UA, with comma"');
  });
});

describe('parseSamples', () => {
  it('round-trips JSON to a deterministic form', () => {
    const samples = [sample(), sample({ label: 'lever-c5' })];

    expect(parseSamples(serializeSamples(samples, 'json-compact'))).toEqual(samples);
  });

  it('returns an empty array for corrupt or non-array input', () => {
    expect(parseSamples('not json {')).toEqual([]);
    expect(parseSamples('{"not":"an array"}')).toEqual([]);
  });
});
