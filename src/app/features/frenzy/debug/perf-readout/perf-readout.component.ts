import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

import type { RenderedPlayer } from '../../ui/components/scene/scene-view-models';

const WORLD_WIDTH = FRENZY.world.width;
const WORLD_HEIGHT = FRENZY.world.height;

// Per-metric tone for the readout colour: `ok` keeps the default blue, `warn` goes amber, `bad` goes red.
type MetricTone = 'ok' | 'warn' | 'bad';

// Colour thresholds, picked so normal play stays blue and only real degradation lights up. FPS is higher-is-better
// (<50 not perfectly smooth → amber; <30 visibly choppy, where the steering rubber-band shows → red). gap/staleness
// are lower-is-better: gap in world px (a tens-of-px lead is a visible overshoot/snap-back); staleness in ms, where
// the snapshot cadence is ~300ms, so up to ~500ms is normal jitter and only a sustained climb means snapshots are
// stalling.
const FPS_WARN = 50;
const FPS_BAD = 30;
const GAP_WARN_PX = 20;
const GAP_BAD_PX = 50;
const STALE_WARN_MS = 500;
const STALE_BAD_MS = 1000;

// Higher-is-better tone (FPS): a non-positive value is startup/no-data → neutral, not "bad".
function toneAbove(value: number, warn: number, bad: number): MetricTone {
  if (value <= 0) {
    return 'ok';
  }

  if (value < bad) {
    return 'bad';
  }

  return value < warn ? 'warn' : 'ok';
}

// Lower-is-better tone (gap/staleness): the -1 sentinel (no own sprite yet) is neutral, not "bad".
function toneBelow(value: number, warn: number, bad: number): MetricTone {
  if (value < 0) {
    return 'ok';
  }

  if (value > bad) {
    return 'bad';
  }

  return value > warn ? 'warn' : 'ok';
}

/**
 * `?debug=perf` readout: a screen-space corner panel showing a smoothed FPS plus, for my own sprite, the
 * prediction-gap (how far the rendered/client-predicted position leads the authoritative one, in world px) and the
 * authoritative staleness (ms since that position last advanced). Both climb when a starved main thread delays
 * snapshot processing — the mechanism behind the steering rubber-band on low-end devices.
 *
 * Self-contained, like the sibling `?debug` panels: gated on `enabled` (only ever set under `?debug=perf`), it runs
 * its own rAF loop to sample FPS and reads the per-frame `players`/`renderedPlayers` inputs to derive gap/staleness,
 * emitting to its readout signals at ~5Hz so the panel stays legible. When disabled it starts no loop and renders
 * an inert (display:none) panel, so it costs nothing in normal play.
 */
@Component({
  selector: 'left-paw-perf-readout',
  templateUrl: './perf-readout.component.html',
  styleUrl: './perf-readout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfReadoutComponent {
  private readonly destroyRef = inject(DestroyRef);

  // Frame-sampling state (see the rAF loop). `lastAuth*` track my sprite's authoritative position so a change
  // stamps `lastAuthChange`; the NaN seeds force the first sample to stamp.
  private lastFrame = 0;
  private fpsEma = 0;
  private lastAuthX = Number.NaN;
  private lastAuthY = Number.NaN;
  private lastAuthChange = 0;
  private lastEmit = 0;

  // Whether the panel is active (`?debug=perf`). Off in normal play → no loop, panel stays display:none.
  public readonly enabled = input.required<boolean>();
  // Authoritative players (server snapshot) and the client-predicted/extrapolated render VMs — the two positions
  // whose divergence for my own sprite is the prediction-gap. Refreshed by the scene's per-frame change detection.
  public readonly players = input.required<readonly Player[]>();
  public readonly renderedPlayers = input.required<readonly RenderedPlayer[]>();
  public readonly myId = input<string | null>(null);

  // Smoothed frame rate; own-sprite prediction-gap (world px); ms since the authoritative position last advanced.
  // gap/staleness are -1 (rendered as —) until my own sprite exists.
  protected readonly fps = signal(0);
  protected readonly gap = signal(-1);
  protected readonly staleness = signal(-1);
  protected readonly gapText = computed(() => {
    const gap = this.gap();

    return gap < 0 ? '—' : `${gap}px`;
  });
  protected readonly stalenessText = computed(() => {
    const staleness = this.staleness();

    return staleness < 0 ? '—' : `${staleness}ms`;
  });

  // Colour tones for each metric — drives the amber/red highlight when a reading degrades past its threshold.
  protected readonly fpsTone = computed(() => toneAbove(this.fps(), FPS_WARN, FPS_BAD));
  protected readonly gapTone = computed(() => toneBelow(this.gap(), GAP_WARN_PX, GAP_BAD_PX));
  protected readonly stalenessTone = computed(() =>
    toneBelow(this.staleness(), STALE_WARN_MS, STALE_BAD_MS),
  );

  public constructor() {
    afterNextRender(() => {
      // The flag is a query-param snapshot (never toggles at runtime), so settle it once: when off, never start the
      // loop — the panel stays a no-op for real players.
      if (!this.enabled()) {
        return;
      }

      let rafId = 0;
      const loop = (): void => {
        // Schedule the next frame first, so a throw in `sample` can never kill the loop.
        rafId = requestAnimationFrame(loop);
        this.sample(performance.now());
      };

      rafId = requestAnimationFrame(loop);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(rafId));
    });
  }

  // Sample this frame's metrics: a smoothed FPS plus, for my own sprite, the prediction-gap (how far the rendered/
  // client-predicted position leads the authoritative one, in world px) and the authoritative staleness (ms since
  // that position last advanced). Both climb when a starved main thread delays snapshot processing — the mechanism
  // behind the steering rubber-band on low-end devices. Emits to the readout signals at ~5Hz so the panel stays
  // legible (its own change detection is cheap).
  private sample(now: number): void {
    const delta = now - this.lastFrame;

    this.lastFrame = now;

    if (delta > 0 && delta < 1000) {
      const instantFps = 1000 / delta;

      this.fpsEma = this.fpsEma === 0 ? instantFps : this.fpsEma * 0.85 + instantFps * 0.15;
    }

    const myPlayerId = this.myId();
    let gap = -1;
    let staleness = -1;

    if (myPlayerId !== null) {
      const authoritative = this.players().find((player) => player.id === myPlayerId);
      const rendered = this.renderedPlayers().find((player) => player.id === myPlayerId);

      if (authoritative !== undefined && rendered !== undefined) {
        gap = Math.hypot(
          (rendered.x - authoritative.x) * WORLD_WIDTH,
          (rendered.y - authoritative.y) * WORLD_HEIGHT,
        );

        if (authoritative.x !== this.lastAuthX || authoritative.y !== this.lastAuthY) {
          this.lastAuthX = authoritative.x;
          this.lastAuthY = authoritative.y;
          this.lastAuthChange = now;
        }

        staleness = now - this.lastAuthChange;
      }
    }

    if (now - this.lastEmit < 200) {
      return;
    }

    this.lastEmit = now;
    this.fps.set(Math.round(this.fpsEma));
    this.gap.set(gap < 0 ? -1 : Math.round(gap));
    this.staleness.set(staleness < 0 ? -1 : Math.round(staleness));
  }
}
