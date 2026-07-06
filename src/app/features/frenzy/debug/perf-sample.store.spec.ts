import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DebugSettingsStore } from './debug-settings.store';
import { PerfSampleStore } from './perf-sample.store';
import type { PerfMetricsSnapshot } from './perf-metrics';
import { FrenzyStorageService } from '../data/services/frenzy-storage.service';

function snapshot(overrides: Partial<PerfMetricsSnapshot> = {}): PerfMetricsSnapshot {
  return {
    fps: 58,
    p50Fps: 60,
    p1Fps: 41,
    jankPercent: 2,
    jitterMs: 1.4,
    sceneLoopMs: 3.2,
    census: { itemsTotal: 12, itemsWritten: 9, itemsSkipped: 3, players: 5 },
    writesPerFrame: 9,
    skipsPerFrame: 3,
    restructuresPerSecond: 3,
    gapPx: 8,
    stalenessMs: 240,
    ...overrides,
  };
}

// Fresh DI scope each call — a re-injected PerfSampleStore re-reads localStorage, simulating a reload.
function stores(): { settings: DebugSettingsStore; store: PerfSampleStore } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [FrenzyStorageService, DebugSettingsStore, PerfSampleStore],
  });

  return { settings: TestBed.inject(DebugSettingsStore), store: TestBed.inject(PerfSampleStore) };
}

describe('PerfSampleStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    // Tests that stamp a ?perf-label query param restore a clean URL so they don't bleed into each other.
    history.replaceState(null, '', location.pathname);
  });

  it('falls back to the ?perf-label query param when the panel label is empty', () => {
    history.replaceState(null, '', `${location.pathname}?perf-label=tablet-run`);

    const { store } = stores();

    store.capture(snapshot(), 1);

    expect(store.samples()[0].label).toBe('tablet-run');
  });

  it('prefers the panel label over the ?perf-label query param', () => {
    history.replaceState(null, '', `${location.pathname}?perf-label=from-url`);

    const { settings, store } = stores();

    settings.updatePerfLog({ label: 'from-panel' });
    store.capture(snapshot(), 1);

    expect(store.samples()[0].label).toBe('from-panel');
  });

  it('captures a sample carrying label/build/device/timestamp and the enabled metrics', () => {
    const { settings, store } = stores();

    settings.updatePerfLog({ label: 'lever-c1' });
    store.capture(snapshot(), 1234);

    const [sample] = store.samples();

    expect(sample.label).toBe('lever-c1');
    expect(sample.build).toBe('dev');
    expect(sample.device.length).toBeGreaterThan(0);
    expect(sample.timestamp).toBe(1234);
    expect(sample.metrics['fps']).toBe(58);
    expect(sample.metrics['itemsTotal']).toBe(12);
  });

  it('persists captured samples so they survive a reload', () => {
    stores().store.capture(snapshot(), 1);

    expect(stores().store.samples()).toHaveLength(1);
  });

  it('caps the log to the configured size, dropping the oldest', () => {
    const { settings, store } = stores();

    settings.updatePerfLog({ cap: 2 });
    store.capture(snapshot(), 1);
    store.capture(snapshot(), 2);
    store.capture(snapshot(), 3);

    expect(store.samples().map((sample) => sample.timestamp)).toEqual([2, 3]);
  });

  it('clears the log and persists the empty state', () => {
    const { store } = stores();

    store.capture(snapshot(), 1);
    store.clear();

    expect(store.samples()).toHaveLength(0);
    expect(stores().store.samples()).toHaveLength(0);
  });

  it('omits a metric from the sample when its toggle is off (configurable composition)', () => {
    const { settings, store } = stores();

    settings.setMetric('gap', false);
    store.capture(snapshot(), 1);

    expect(store.samples()[0].metrics['gapPx']).toBeUndefined();
    expect(store.samples()[0].metrics['fps']).toBeDefined();
  });

  it('exports the log in the configured format', () => {
    const { settings, store } = stores();

    store.capture(snapshot(), 1);

    settings.updatePerfLog({ exportFormat: 'csv' });
    expect(store.exportText().startsWith('label,build,device,timestamp,')).toBe(true);

    settings.updatePerfLog({ exportFormat: 'json-compact' });
    expect(store.exportText().startsWith('[{')).toBe(true);
  });
});
