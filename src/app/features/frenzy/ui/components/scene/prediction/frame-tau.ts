// Frame-interval → reconciliation-τ tracking shared by the scene extrapolators (player and item), so both sides
// reconcile snapshot corrections with the same frame-aware glide. See ADR 0003 (frame-aware reconciliation).

import { frameAwareTau, OFFSET_DECAY_TAU_MS } from './drift-math';

// EMA weight for the frame-interval estimate that feeds the frame-aware reconciliation τ (higher = adapts faster
// to an FPS change, noisier). Light smoothing so a single hitched frame doesn't spike τ.
const FRAME_EMA_WEIGHT = 0.2;

// Frame deltas above this (ms, ~4fps) are treated as a stall/hitch and skipped, so a backgrounded tab or GC pause
// can't bloat the average and freeze the glide. Genuine low-end frames (down to ~4fps) still update it.
export const FRAME_DT_CAP_MS = 250;

/**
 * Tracks the smoothed frame interval from the rAF `tick` cadence and derives the frame-aware reconciliation τ
 * (ADR 0003): on a slow client τ rises so no single frame collapses more than `MAX_OFFSET_COLLAPSE_PER_FRAME` of
 * a reconciliation offset (the rubber-band snap); on a fast client it stays at the base `OFFSET_DECAY_TAU_MS`.
 * Call `measure(now)` once per animation frame — never from `ingest`, which runs on the ~300ms snapshot cadence
 * and isn't a frame — then read `tauMs` for every reconciliation decay until the next measurement, so all readers
 * within a frame agree. A plain class (not injectable): each extrapolator owns its instance.
 */
export class FrameTauTracker {
  // Smoothed frame interval (ms); 0 until the first interval is seen.
  private smoothedFrameMs = 0;
  private lastTickNow = 0;
  private _tauMs = OFFSET_DECAY_TAU_MS;

  // Current reconciliation τ: the base on a fast client, raised on a slow one (frame-aware).
  public get tauMs(): number {
    return this._tauMs;
  }

  // Fold one animation-frame timestamp into the interval estimate and re-derive τ. Non-positive deltas and long
  // stalls (backgrounded tab, GC pause) are skipped so they can't bloat the estimate and freeze the glide.
  public measure(now: number): void {
    if (this.lastTickNow !== 0) {
      const dt = now - this.lastTickNow;

      if (dt > 0 && dt <= FRAME_DT_CAP_MS) {
        this.smoothedFrameMs =
          this.smoothedFrameMs === 0
            ? dt
            : this.smoothedFrameMs * (1 - FRAME_EMA_WEIGHT) + dt * FRAME_EMA_WEIGHT;
        this._tauMs = frameAwareTau(OFFSET_DECAY_TAU_MS, this.smoothedFrameMs);
      }
    }

    this.lastTickNow = now;
  }
}
