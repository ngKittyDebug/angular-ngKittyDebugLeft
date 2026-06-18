import { beforeEach, describe, expect, it } from 'vitest';

import { DebugSettingsStore, PERF_METRIC_KEYS, SCENE_LAYER_KEYS } from './debug-settings.store';
import type { PerfLogConfig } from './debug-settings.store';

const STORAGE_KEY = 'frenzy:debug-settings';

const DEFAULT_PERF_LOG: PerfLogConfig = {
  captureMode: 'manual',
  captureIntervalSeconds: 10,
  exportFormat: 'json-pretty',
  exportDestination: 'clipboard',
  cap: 50,
  label: '',
};

// A fresh store reads from localStorage in its constructor, so `new` after a write simulates a page reload.
function reload(): DebugSettingsStore {
  return new DebugSettingsStore();
}

describe('DebugSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with every metric visible and the default perf-log config when storage is empty', () => {
    const store = new DebugSettingsStore();

    for (const key of PERF_METRIC_KEYS) {
      expect(store.metrics()[key]).toBe(true);
    }

    expect(store.perfLog()).toEqual(DEFAULT_PERF_LOG);
  });

  it('persists a metric toggle so it survives a reload', () => {
    const store = new DebugSettingsStore();

    store.setMetric('gap', false);

    expect(store.metrics()['gap']).toBe(false);
    expect(reload().metrics()['gap']).toBe(false);
  });

  it('flips a metric with toggleMetric and persists the flip', () => {
    const store = new DebugSettingsStore();

    store.toggleMetric('fps');
    expect(store.metrics()['fps']).toBe(false);
    expect(reload().metrics()['fps']).toBe(false);

    store.toggleMetric('fps');
    expect(reload().metrics()['fps']).toBe(true);
  });

  it('patches perf-log fields without disturbing the others, and persists them', () => {
    const store = new DebugSettingsStore();

    store.updatePerfLog({ cap: 100, captureMode: 'auto' });

    expect(store.perfLog()).toEqual({ ...DEFAULT_PERF_LOG, cap: 100, captureMode: 'auto' });
    expect(reload().perfLog()).toEqual({ ...DEFAULT_PERF_LOG, cap: 100, captureMode: 'auto' });
  });

  it('falls back to defaults when the stored blob is not valid JSON, without throwing', () => {
    localStorage.setItem(STORAGE_KEY, 'not json {');

    const store = reload();

    expect(store.metrics()['fps']).toBe(true);
    expect(store.perfLog()).toEqual(DEFAULT_PERF_LOG);
  });

  it('merges a partial blob over defaults and ignores unknown keys', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ metrics: { gap: false, bogus: true }, perfLog: { cap: 7 } }),
    );

    const store = reload();

    expect(store.metrics()['gap']).toBe(false);
    expect(store.metrics()['fps']).toBe(true);
    expect((store.metrics() as Record<string, boolean>)['bogus']).toBeUndefined();
    expect(store.perfLog().cap).toBe(7);
    expect(store.perfLog().captureMode).toBe('manual');
  });

  it('rejects wrong-typed fields per field, keeping their defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        metrics: { fps: 'yes' },
        perfLog: { cap: -5, captureMode: 'nonsense', label: 42 },
      }),
    );

    const store = reload();

    expect(store.metrics()['fps']).toBe(true);
    expect(store.perfLog().cap).toBe(50);
    expect(store.perfLog().captureMode).toBe('manual');
    expect(store.perfLog().label).toBe('');
  });

  it('defaults to the DOM renderer at native DPR with animated sprites when storage is empty', () => {
    const store = new DebugSettingsStore();

    expect(store.renderMode()).toBe('dom');
    expect(store.canvasDprCap()).toBe(0);
    expect(store.freezeSprites()).toBe(false);
  });

  it('persists the render mode, DPR cap and sprite-freeze so they survive a reload', () => {
    const store = new DebugSettingsStore();

    store.setRenderMode('canvas');
    store.setCanvasDprCap(1.5);
    store.setFreezeSprites(true);

    expect(store.renderMode()).toBe('canvas');
    expect(store.canvasDprCap()).toBe(1.5);
    expect(store.freezeSprites()).toBe(true);
    expect(reload().renderMode()).toBe('canvas');
    expect(reload().canvasDprCap()).toBe(1.5);
    expect(reload().freezeSprites()).toBe(true);
  });

  it('rejects an unknown render mode / DPR cap and a non-boolean sprite-freeze, keeping the defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ renderMode: 'webgl', canvasDprCap: 3, freezeSprites: 'yes' }),
    );

    const store = reload();

    expect(store.renderMode()).toBe('dom');
    expect(store.canvasDprCap()).toBe(0);
    expect(store.freezeSprites()).toBe(false);
  });

  it('starts with every scene layer visible when storage is empty', () => {
    const store = new DebugSettingsStore();

    for (const key of SCENE_LAYER_KEYS) {
      expect(store.sceneLayers()[key]).toBe(true);
    }
  });

  it('persists a hidden scene layer and ignores unknown layer keys', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sceneLayers: { kelp: false, bogus: true } }),
    );

    const store = reload();

    expect(store.sceneLayers()['kelp']).toBe(false);
    expect(store.sceneLayers()['decor']).toBe(true);
    expect((store.sceneLayers() as Record<string, boolean>)['bogus']).toBeUndefined();
  });

  it('toggles a scene layer and persists the flip', () => {
    const store = new DebugSettingsStore();

    store.toggleSceneLayer('parallax');

    expect(store.sceneLayers()['parallax']).toBe(false);
    expect(reload().sceneLayers()['parallax']).toBe(false);
  });
});
