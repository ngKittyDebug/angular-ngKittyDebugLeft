import { DestroyRef, inject, Injectable } from '@angular/core';

import type { Item, Player } from '@game/frenzy/types';

import { frameIntervalMs, paceFrame } from './frame-pacing';
import type { CameraSnapshot } from '../camera/scene-camera.service';
import { SceneFacade } from '../scene.facade';
import type { RenderedPlayer } from '../scene-view-models';
import type { DebugFlags } from '../../../../debug/debug-options';
import type { RenderMode } from '../../../../debug/debug-settings.store';

// The offscreen-indicators overlay reduced to the single method the loop drives. Declared structurally (not the
// component type) so this service never imports the component that imports the scene that provides it — which would
// be an import cycle. The loop feeds it the current rendered player VMs (it no longer injects the scene's
// extrapolator — ADR 0004 §5).
export interface OffscreenIndicatorsHandle {
  frame(camera: CameraSnapshot, now: number, rendered: readonly RenderedPlayer[]): void;
}

// The `?debug=perf` metric accumulator reduced to the single method the loop drives (structural, like the handle
// above — no import of the service). Fed only under the master gate, with this frame's scene-loop JS time.
export interface PerfMetricsRecorder {
  record(now: number, sceneLoopMs: number, players: readonly Player[], myId: string | null): void;
}

// Everything the render loop reads each frame, supplied by the scene view shell: live input accessors, the (static)
// debug toggles, the DOM refs the camera writes, and the offscreen-indicators overlay handle. The "frame-inputs
// provider" of ADR 0004 §4.
export interface SceneFrameContext {
  items(): readonly Item[];
  players(): readonly Player[];
  myId(): string | null;
  evolving(): ReadonlyMap<string, number>;
  // The live item render backend ('dom' | 'canvas') — read each frame so the toggle takes effect without a reload.
  renderMode(): RenderMode;
  // The live decor render backend ('dom' | 'canvas') — read each frame so the toggle takes effect without a reload.
  decorMode(): RenderMode;
  // Frame-pacing cap target in fps (0 = uncapped) — read each frame so the toggle takes effect without a reload.
  frameCapFps(): number;
  readonly debug: DebugFlags;
  readonly debugBoxesActive: boolean;
  world(): HTMLElement | undefined;
  parallaxNear(): HTMLElement | undefined;
  parallaxMid(): HTMLElement | undefined;
  foregroundKelp(): HTMLElement | undefined;
  offscreenIndicators(): OffscreenIndicatorsHandle | undefined;
  // The perf accumulator — supplied (non-undefined) only under `?debug=perf`, so the loop calls it for nobody else.
  perfMetrics(): PerfMetricsRecorder | undefined;
}

/**
 * The scene's rAF render-loop driver. Owns the animation-frame lifecycle (scheduled via `requestAnimationFrame`,
 * cancelled on the owning injection scope's destroy through `DestroyRef`) and the per-frame call sequence into
 * `SceneFacade`. The component drops to a view shell that supplies the refs and the per-frame inputs via
 * `SceneFrameContext`; this is the seam a future canvas renderer swaps at (relates ADR 0001/0004 §4).
 */
@Injectable()
export class SceneRenderLoopService {
  private readonly facade = inject(SceneFacade);
  private readonly destroyRef = inject(DestroyRef);

  public start(context: SceneFrameContext): void {
    let rafId = 0;
    // Frame-pacing accumulator (slice 13): banked elapsed time + the previous tick's timestamp, carried across frames.
    let lastNow = performance.now();
    let accumulatedMs = 0;

    const loop = (): void => {
      // Schedule the next frame first, so a throw anywhere below can never kill the animation loop.
      rafId = requestAnimationFrame(loop);

      const now = performance.now();

      // Bank the elapsed time and let the pure pacer decide whether this tick renders or is held back by the cap.
      // Cap off (0) → renders every tick, so normal play and capable devices are unchanged.
      accumulatedMs += now - lastNow;
      lastNow = now;

      const pacing = paceFrame(accumulatedMs, frameIntervalMs(context.frameCapFps()));

      accumulatedMs = pacing.carryMs;

      if (!pacing.render) {
        return;
      }

      this.facade.tickItems(context.items(), now, context.renderMode() === 'canvas');

      // Canvas decor backend (ADR 0007): redraw the backdrop kelp each frame. In DOM mode the kelp is pure CSS and
      // there is nothing to tick here.
      if (context.decorMode() === 'canvas') {
        this.facade.tickDecor(now);
      }

      this.facade.tickPlayers(context.players(), context.myId(), context.evolving(), now);

      // The box overlay (a dev tool) republishes structure so its boxes track the imperatively-moved sprites.
      if (context.debugBoxesActive) {
        this.facade.publishDebugFrame();
      }

      const world = context.world();

      if (world !== undefined) {
        this.facade.updateCamera(
          world,
          context.parallaxNear(),
          context.parallaxMid(),
          context.foregroundKelp(),
        );
        // Right after the camera writes this frame's transform, reposition the off-screen indicators off the
        // matching snapshot (zero phase skew), feeding them the current rendered player VMs; the overlay throttles
        // its own structural recompute internally.
        context
          .offscreenIndicators()
          ?.frame(this.facade.cameraSnapshot(), now, this.facade.renderedPlayers());
      }

      // Under `?debug=perf` only: this frame's scene-loop JS time (from frame start to here — our script, not the
      // compositor) feeds the metric accumulator. Gated so the perf subsystem and its change detection never run for
      // a real player.
      if (context.debug.perf) {
        const sceneLoopMs = performance.now() - now;

        context.perfMetrics()?.record(now, sceneLoopMs, context.players(), context.myId());
      }
    };

    rafId = requestAnimationFrame(loop);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(rafId));
  }
}
