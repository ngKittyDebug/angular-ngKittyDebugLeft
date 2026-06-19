import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  DebugSettingsStore,
  DECOR_PROBE_KEYS,
  PERF_METRIC_KEYS,
  SCENE_LAYER_KEYS,
} from './debug-settings.store';
import type { PerfLogConfig } from './debug-settings.store';
import { FrenzyStorageService } from '../data/services/frenzy-storage.service';

const STORAGE_KEY = 'frenzy:debug-settings';

const DEFAULT_PERF_LOG: PerfLogConfig = {
  captureMode: 'manual',
  captureIntervalSeconds: 10,
  exportFormat: 'json-pretty',
  exportDestination: 'clipboard',
  cap: 50,
  label: '',
};

// The store field-injects FrenzyStorageService, so a fresh instance is built inside TestBed's injection context (the
// provided service wraps the test env's localStorage, so the localStorage assertions hold). Constructing a fresh store
// after a write simulates a page reload.
function makeStore(): DebugSettingsStore {
  return TestBed.runInInjectionContext(() => new DebugSettingsStore());
}

function reload(): DebugSettingsStore {
  return makeStore();
}

describe('DebugSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [FrenzyStorageService] });
  });

  it('starts with every metric visible and the default perf-log config when storage is empty', () => {
    const store = makeStore();

    for (const key of PERF_METRIC_KEYS) {
      expect(store.metrics()[key]).toBe(true);
    }

    expect(store.perfLog()).toEqual(DEFAULT_PERF_LOG);
  });

  it('persists a metric toggle so it survives a reload', () => {
    const store = makeStore();

    store.setMetric('gap', false);

    expect(store.metrics()['gap']).toBe(false);
    expect(reload().metrics()['gap']).toBe(false);
  });

  it('flips a metric with toggleMetric and persists the flip', () => {
    const store = makeStore();

    store.toggleMetric('fps');
    expect(store.metrics()['fps']).toBe(false);
    expect(reload().metrics()['fps']).toBe(false);

    store.toggleMetric('fps');
    expect(reload().metrics()['fps']).toBe(true);
  });

  it('patches perf-log fields without disturbing the others, and persists them', () => {
    const store = makeStore();

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
    const store = makeStore();

    expect(store.renderMode()).toBe('dom');
    expect(store.canvasDprCap()).toBe(0);
    expect(store.freezeSprites()).toBe(false);
  });

  it('persists the render mode, DPR cap and sprite-freeze so they survive a reload', () => {
    const store = makeStore();

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

  it('defaults the frame cap to off and persists a chosen cap across a reload', () => {
    const store = makeStore();

    expect(store.frameCapFps()).toBe(0);

    store.setFrameCapFps(24);

    expect(store.frameCapFps()).toBe(24);
    expect(reload().frameCapFps()).toBe(24);
  });

  it('rejects an unknown frame cap, keeping it off', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ frameCapFps: 45 }));

    expect(reload().frameCapFps()).toBe(0);
  });

  it('starts with every scene layer visible when storage is empty', () => {
    const store = makeStore();

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
    const store = makeStore();

    store.toggleSceneLayer('parallax');

    expect(store.sceneLayers()['parallax']).toBe(false);
    expect(reload().sceneLayers()['parallax']).toBe(false);
  });

  it('starts with every decor probe OFF when storage is empty', () => {
    const store = makeStore();

    for (const key of DECOR_PROBE_KEYS) {
      expect(store.decorProbe()[key]).toBe(false);
    }
  });

  it('toggles a decor probe and persists the flip', () => {
    const store = makeStore();

    store.toggleDecorProbe('freeze');

    expect(store.decorProbe()['freeze']).toBe(true);
    expect(reload().decorProbe()['freeze']).toBe(true);
  });

  it('persists an enabled decor probe and ignores unknown / wrong-typed probe keys', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ decorProbe: { noPlants: true, flatRays: 'yes', bogus: true } }),
    );

    const store = reload();

    expect(store.decorProbe()['noPlants']).toBe(true);
    expect(store.decorProbe()['flatRays']).toBe(false);
    expect(store.decorProbe()['noRays']).toBe(false);
    expect((store.decorProbe() as Record<string, boolean>)['bogus']).toBeUndefined();
  });
});
