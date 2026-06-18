import { inject, Injectable, signal } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

import {
  frameTimingStats,
  nextEmaFps,
  PERF_WINDOW_SIZE,
  predictionGapPx,
  pushCapped,
} from '../../../debug/perf-metrics';
import type { PerfMetricsSnapshot } from '../../../debug/perf-metrics';
import { SceneActorRegistryService } from './scene-actor-registry.service';
import { SceneFacade } from './scene.facade';

const WORLD_WIDTH = FRENZY.world.width;
const WORLD_HEIGHT = FRENZY.world.height;
// Throttle snapshot publishes to ~5Hz: the loop feeds `record` every frame (cheap accumulation), but a new snapshot —
// the only thing that re-renders the readout — is set at most this often, keeping the panel legible and its CD cheap.
const EMIT_INTERVAL_MS = 200;
// Restructure events older than this are pruned, so the count reads as "structural republications in the last second".
const RESTRUCTURE_WINDOW_MS = 1000;

/**
 * Owns the `?debug=perf` metric accumulation: a window of frame intervals (EMA + p50/p1/jank/jitter), the own-sprite
 * prediction-gap/staleness, the actor census (from the registry's cull tally), and the structural-republication rate
 * (detected by reference change of the scene's structure signals — the readout of the future CD levers). The scene
 * render loop calls `record` once per frame *only under the master gate*, so a real player never instantiates this
 * service (it is provided in the scene but injected only when the perf subsystem renders). Published as one throttled
 * `snapshot` signal that the readout and perf-log consume.
 */
@Injectable()
export class PerfMetricsService {
  private readonly facade = inject(SceneFacade);
  private readonly registry = inject(SceneActorRegistryService);
  private readonly _snapshot = signal<PerfMetricsSnapshot | null>(null);
  // Frame-timing accumulation.
  private intervals: readonly number[] = [];
  private fpsEma = 0;
  private lastFrameAt = 0;
  private lastEmitAt = 0;
  // Own-sprite authoritative tracking for staleness (NaN seeds force the first reading to stamp).
  private lastAuthX = Number.NaN;
  private lastAuthY = Number.NaN;
  private lastAuthChangeAt = 0;
  // Structural-republication detection: the structure signals keep a stable reference until republished, so a changed
  // reference is one `@for` re-evaluation. Timestamps drive the per-second rate.
  private lastItemsRef: unknown = null;
  private lastPlayersRef: unknown = null;
  private restructureTimes: readonly number[] = [];

  public readonly snapshot = this._snapshot.asReadonly();

  // Called once per frame by the scene render loop, only under `?debug=perf`. Accumulates every frame; publishes a new
  // snapshot at ~5Hz.
  public record(
    now: number,
    sceneLoopMs: number,
    players: readonly Player[],
    myId: string | null,
  ): void {
    const interval = this.lastFrameAt === 0 ? 0 : now - this.lastFrameAt;

    this.lastFrameAt = now;

    if (interval > 0) {
      this.intervals = pushCapped(this.intervals, interval, PERF_WINDOW_SIZE);
      this.fpsEma = nextEmaFps(this.fpsEma, interval);
    }

    this.countRestructures(now);

    if (now - this.lastEmitAt < EMIT_INTERVAL_MS) {
      return;
    }

    this.lastEmitAt = now;
    this._snapshot.set(this.buildSnapshot(now, sceneLoopMs, players, myId));
  }

  private countRestructures(now: number): void {
    const itemsReference = this.facade.renderedItems();
    const playersReference = this.facade.renderedPlayers();
    let times = this.restructureTimes;

    if (itemsReference !== this.lastItemsRef) {
      this.lastItemsRef = itemsReference;
      times = [...times, now];
    }

    if (playersReference !== this.lastPlayersRef) {
      this.lastPlayersRef = playersReference;
      times = [...times, now];
    }

    this.restructureTimes = times.filter((time) => now - time < RESTRUCTURE_WINDOW_MS);
  }

  private gapAndStaleness(
    now: number,
    players: readonly Player[],
    myId: string | null,
  ): { gapPx: number; stalenessMs: number } {
    if (myId === null) {
      return { gapPx: -1, stalenessMs: -1 };
    }

    const authoritative = players.find((player) => player.id === myId);
    const rendered = this.facade.playerFrame().find((player) => player.id === myId);

    if (authoritative === undefined || rendered === undefined) {
      return { gapPx: -1, stalenessMs: -1 };
    }

    if (authoritative.x !== this.lastAuthX || authoritative.y !== this.lastAuthY) {
      this.lastAuthX = authoritative.x;
      this.lastAuthY = authoritative.y;
      this.lastAuthChangeAt = now;
    }

    return {
      gapPx: predictionGapPx(authoritative, rendered, WORLD_WIDTH, WORLD_HEIGHT),
      stalenessMs: now - this.lastAuthChangeAt,
    };
  }

  private buildSnapshot(
    now: number,
    sceneLoopMs: number,
    players: readonly Player[],
    myId: string | null,
  ): PerfMetricsSnapshot {
    const timing = frameTimingStats(this.intervals);
    const tally = this.registry.writeTally();
    const { gapPx, stalenessMs } = this.gapAndStaleness(now, players, myId);

    return {
      fps: this.fpsEma,
      p50Fps: timing.p50Fps,
      p1Fps: timing.p1Fps,
      jankPercent: timing.jankPercent,
      jitterMs: timing.jitterMs,
      sceneLoopMs,
      census: {
        itemsTotal: tally.total,
        itemsWritten: tally.written,
        itemsSkipped: tally.skipped,
        players: players.length,
      },
      writesPerFrame: tally.written,
      skipsPerFrame: tally.skipped,
      restructuresPerSecond: this.restructureTimes.length,
      gapPx,
      stalenessMs,
    };
  }
}
