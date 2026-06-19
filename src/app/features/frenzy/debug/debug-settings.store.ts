import { inject, Injectable, signal } from '@angular/core';

import { FrenzyStorageService } from '../data/services/frenzy-storage.service';

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

// Item render backend (hybrid-canvas A/B). `dom` is the per-element renderer (today's default and the safe
// fallback); `canvas` draws the falling items on one `<canvas>`. A persisted runtime toggle so the two can be A/B'd
// on the tablet across reloads/rebuilds — same rationale as the perf-log config.
export type RenderMode = 'dom' | 'canvas';

// Canvas backing-store resolution cap (canvas mode only): `0` renders at the native device pixel ratio; `1` / `1.5`
// cap it lower, trading sharpness for far less rasterisation — the fill-rate lever a weak tablet GPU actually feels.
export type CanvasDprCap = 0 | 1 | 1.5;

// Frame-pacing cap (slice 13): `0` disables it (render every frame — the desktop-safe default); otherwise the render
// loop holds a steady FPS at this target, trading peak rate for even pacing on a weak tablet that lurches 17↔30.
export type FrameCapFps = 0 | 20 | 24 | 30;

// Scene render layers the `?debug=perf` panel can hide independently, to bisect which one costs the most fill-rate on
// a weak device (the actor toggles confirm if it's NOT the sprites/items, the background ones if it IS the decor).
// Order is the display order. `decor` = seabed/light-rays/bubbles; `kelp` = mid + foreground fronds; `parallax` =
// the drifting speck layers; `items` = falling items (DOM or canvas); `players` = the Pokémon sprites.
export const SCENE_LAYER_KEYS = ['decor', 'kelp', 'parallax', 'items', 'players'] as const;

export type SceneLayerKey = (typeof SCENE_LAYER_KEYS)[number];

// Within-decor diagnostic probes (?debug=perf) — finer than the whole-layer `decor` hide, to bisect WHICH part of the
// decor layer costs the most once `decor` is fingered. Each is OFF by default (false = normal decor); flipping one
// applies a `.scene--decor-*` host class that aquarium-decor reads via `:host-context` (scene.scss can't reach into the
// child's encapsulated internals). `freeze` stops every decor animation but keeps it PAINTED (splits per-frame
// animation cost from static paint/composite); `noPlants`/`noRays` hide one sub-element to attribute the cost;
// `flatRays` is the speculative neutral fix — rays without the `mix-blend-mode: screen` pass — shipped behind this A/B
// toggle until the eye confirms it on the tablet (ADR 0006). Order is the display order.
export const DECOR_PROBE_KEYS = ['freeze', 'noPlants', 'noRays', 'flatRays'] as const;

export type DecorProbeKey = (typeof DECOR_PROBE_KEYS)[number];

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

// The full persisted debug-perf settings: a visibility toggle per metric, the perf-log config, the item render
// backend + its DPR cap (hybrid-canvas A/B), and the sprite-freeze toggle.
export interface DebugSettings {
  metrics: Record<PerfMetricKey, boolean>;
  perfLog: PerfLogConfig;
  renderMode: RenderMode;
  // Decor backdrop render backend (ADR 0007). `canvas` (the DEFAULT, after the tablet A/B went green) draws the
  // animated backdrop — kelp, motes, bubbles, vignette — on one canvas; `dom` is the retained fallback (the swaying-
  // SVG/CSS backdrop). The static floor + screen-blended rays stay DOM either way. Persisted, A/B'd independently of
  // `renderMode` (the item backend) on the device.
  decorMode: RenderMode;
  canvasDprCap: CanvasDprCap;
  // Render players as a static first frame instead of the animated GIF — kills the per-frame sprite decode/re-raster
  // that pins the FPS floor on a weak tablet. A persisted `?debug=perf` toggle (A/B'd on the device); default off.
  freezeSprites: boolean;
  // Per-layer render switches — each true = that layer renders (default), false = hidden, to bisect the FPS culprit.
  sceneLayers: Record<SceneLayerKey, boolean>;
  // Frame-pacing cap target in fps (0 = uncapped). Persisted `?debug=perf` toggle, A/B'd on the device.
  frameCapFps: FrameCapFps;
  // Within-decor diagnostic probes — each false by default (normal decor). See DECOR_PROBE_KEYS.
  decorProbe: Record<DecorProbeKey, boolean>;
}

const STORAGE_KEY = 'frenzy:debug-settings';

const CAPTURE_MODES: readonly CaptureMode[] = ['manual', 'auto'];
const EXPORT_FORMATS: readonly PerfExportFormat[] = ['json-compact', 'json-pretty', 'csv'];
const EXPORT_DESTINATIONS: readonly PerfExportDestination[] = ['clipboard', 'textarea', 'download'];

// Exported for the debug-configurator UI to render the toggle/segmented choices.
export const RENDER_MODES: readonly RenderMode[] = ['dom', 'canvas'];
export const CANVAS_DPR_CAPS: readonly CanvasDprCap[] = [0, 1, 1.5];
export const FRAME_CAP_FPS: readonly FrameCapFps[] = [0, 20, 24, 30];

function defaultMetrics(): Record<PerfMetricKey, boolean> {
  // Every metric on by default — a reasonable starting readout; the user toggles off the noise.
  return Object.fromEntries(PERF_METRIC_KEYS.map((key) => [key, true])) as Record<
    PerfMetricKey,
    boolean
  >;
}

function defaultSceneLayers(): Record<SceneLayerKey, boolean> {
  // Every layer on by default — the toggles only ever HIDE a layer to isolate its cost.
  return Object.fromEntries(SCENE_LAYER_KEYS.map((key) => [key, true])) as Record<
    SceneLayerKey,
    boolean
  >;
}

function defaultDecorProbe(): Record<DecorProbeKey, boolean> {
  // Every probe OFF by default — flipping one only ever ADDS a diagnostic override on top of normal decor.
  return Object.fromEntries(DECOR_PROBE_KEYS.map((key) => [key, false])) as Record<
    DecorProbeKey,
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
  return {
    metrics: defaultMetrics(),
    perfLog: defaultPerfLog(),
    renderMode: 'dom',
    decorMode: 'canvas',
    canvasDprCap: 0,
    freezeSprites: false,
    sceneLayers: defaultSceneLayers(),
    frameCapFps: 0,
    decorProbe: defaultDecorProbe(),
  };
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

function coerceSceneLayers(
  raw: unknown,
  fallback: Record<SceneLayerKey, boolean>,
): Record<SceneLayerKey, boolean> {
  if (typeof raw !== 'object' || raw === null) {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const layers = { ...fallback };

  for (const key of SCENE_LAYER_KEYS) {
    const value = source[key];

    if (typeof value === 'boolean') {
      layers[key] = value;
    }
  }

  return layers;
}

function coerceDecorProbe(
  raw: unknown,
  fallback: Record<DecorProbeKey, boolean>,
): Record<DecorProbeKey, boolean> {
  if (typeof raw !== 'object' || raw === null) {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const probe = { ...fallback };

  for (const key of DECOR_PROBE_KEYS) {
    const value = source[key];

    if (typeof value === 'boolean') {
      probe[key] = value;
    }
  }

  return probe;
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
    renderMode: oneOf(source['renderMode'], RENDER_MODES, defaults.renderMode),
    decorMode: oneOf(source['decorMode'], RENDER_MODES, defaults.decorMode),
    canvasDprCap: oneOf(source['canvasDprCap'], CANVAS_DPR_CAPS, defaults.canvasDprCap),
    freezeSprites:
      typeof source['freezeSprites'] === 'boolean'
        ? source['freezeSprites']
        : defaults.freezeSprites,
    sceneLayers: coerceSceneLayers(source['sceneLayers'], defaults.sceneLayers),
    frameCapFps: oneOf(source['frameCapFps'], FRAME_CAP_FPS, defaults.frameCapFps),
    decorProbe: coerceDecorProbe(source['decorProbe'], defaults.decorProbe),
  };
}

function readStored(storage: FrenzyStorageService): DebugSettings {
  // getJson degrades to null on a missing key, an SSR/no-storage env, or a corrupt blob; coerceSettings(null) → defaults.
  return coerceSettings(storage.getJson(STORAGE_KEY));
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
  private readonly storage = inject(FrenzyStorageService);
  private readonly _metrics = signal<Record<PerfMetricKey, boolean>>(defaultMetrics());
  private readonly _perfLog = signal<PerfLogConfig>(defaultPerfLog());
  private readonly _renderMode = signal<RenderMode>('dom');
  private readonly _decorMode = signal<RenderMode>('canvas');
  private readonly _canvasDprCap = signal<CanvasDprCap>(0);
  private readonly _freezeSprites = signal(false);
  private readonly _sceneLayers = signal<Record<SceneLayerKey, boolean>>(defaultSceneLayers());
  private readonly _frameCapFps = signal<FrameCapFps>(0);
  private readonly _decorProbe = signal<Record<DecorProbeKey, boolean>>(defaultDecorProbe());

  public readonly metrics = this._metrics.asReadonly();
  public readonly perfLog = this._perfLog.asReadonly();
  public readonly renderMode = this._renderMode.asReadonly();
  public readonly decorMode = this._decorMode.asReadonly();
  public readonly canvasDprCap = this._canvasDprCap.asReadonly();
  public readonly freezeSprites = this._freezeSprites.asReadonly();
  public readonly sceneLayers = this._sceneLayers.asReadonly();
  public readonly frameCapFps = this._frameCapFps.asReadonly();
  public readonly decorProbe = this._decorProbe.asReadonly();

  public constructor() {
    const stored = readStored(this.storage);

    this._metrics.set(stored.metrics);
    this._perfLog.set(stored.perfLog);
    this._renderMode.set(stored.renderMode);
    this._decorMode.set(stored.decorMode);
    this._canvasDprCap.set(stored.canvasDprCap);
    this._freezeSprites.set(stored.freezeSprites);
    this._sceneLayers.set(stored.sceneLayers);
    this._frameCapFps.set(stored.frameCapFps);
    this._decorProbe.set(stored.decorProbe);
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

  public setRenderMode(mode: RenderMode): void {
    this._renderMode.set(mode);
    this.persist();
  }

  public setDecorMode(mode: RenderMode): void {
    this._decorMode.set(mode);
    this.persist();
  }

  public setCanvasDprCap(cap: CanvasDprCap): void {
    this._canvasDprCap.set(cap);
    this.persist();
  }

  public setFreezeSprites(value: boolean): void {
    this._freezeSprites.set(value);
    this.persist();
  }

  public setSceneLayer(key: SceneLayerKey, value: boolean): void {
    this._sceneLayers.update((layers) => ({ ...layers, [key]: value }));
    this.persist();
  }

  public toggleSceneLayer(key: SceneLayerKey): void {
    this.setSceneLayer(key, !this._sceneLayers()[key]);
  }

  public setFrameCapFps(cap: FrameCapFps): void {
    this._frameCapFps.set(cap);
    this.persist();
  }

  public setDecorProbe(key: DecorProbeKey, value: boolean): void {
    this._decorProbe.update((probe) => ({ ...probe, [key]: value }));
    this.persist();
  }

  public toggleDecorProbe(key: DecorProbeKey): void {
    this.setDecorProbe(key, !this._decorProbe()[key]);
  }

  private persist(): void {
    const settings: DebugSettings = {
      metrics: this._metrics(),
      perfLog: this._perfLog(),
      renderMode: this._renderMode(),
      decorMode: this._decorMode(),
      canvasDprCap: this._canvasDprCap(),
      freezeSprites: this._freezeSprites(),
      sceneLayers: this._sceneLayers(),
      frameCapFps: this._frameCapFps(),
      decorProbe: this._decorProbe(),
    };

    this.storage.setJson(STORAGE_KEY, settings);
  }
}
