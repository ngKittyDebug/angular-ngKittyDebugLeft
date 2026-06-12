import { inject, Injectable, Renderer2 } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import {
  CAMERA_DEAD_ZONE_X_HIGH,
  CAMERA_DEAD_ZONE_X_LOW,
  CAMERA_DEAD_ZONE_Y_HIGH,
  CAMERA_DEAD_ZONE_Y_LOW,
  CAMERA_LERP,
  cameraScale,
  centerCameraAxis,
  deadZoneCameraAxis,
  FOREGROUND_WIDTH_FACTOR,
  PARALLAX_FRONT,
  PARALLAX_MID,
  PARALLAX_NEAR,
} from './camera-math';
import { PlayerExtrapolatorService } from './player-extrapolator.service';

/**
 * A frozen, synchronous read of the camera's current frame state, in `.scene` screen px. Consumed by overlays
 * (e.g. the off-screen indicators) that project world points to screen each frame. Deliberately a plain getter,
 * NOT a signal — a signal would invite reactive reads and drag per-frame change detection back into the rAF loop,
 * which the whole Renderer2-driven scene is built to avoid.
 */
export interface CameraSnapshot {
  camX: number;
  camY: number;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
  // False until the first frame has snapped the camera (the world ref is absent for a few frames under async
  // *transloco); consumers skip projecting until then.
  ready: boolean;
}

/**
 * Owns the camera's per-frame state (offset + first-frame snap) and writes the easing result to the world layer
 * (a sub-pixel translate + responsive scale) and the foreground parallax layers via Renderer2. The focus point
 * is read from the player extrapolator's rendered "me"; math lives in `camera-math` so this stays a thin
 * DOM-writing shell.
 */
@Injectable()
export class SceneCameraService {
  private readonly renderer = inject(Renderer2);
  private readonly players = inject(PlayerExtrapolatorService);
  private readonly worldWidth = FRENZY.world.width;
  private readonly worldHeight = FRENZY.world.height;
  // Camera offset (px) applied to the world layer, eased toward its dead-zone target each frame (sub-pixel, no
  // rounding). `cameraReady` snaps to the centred target on the first frame so the view opens already centred
  // instead of swooping in from the corner.
  private camX = 0;
  private camY = 0;
  private cameraReady = false;
  // Last frame's scale and viewport size, cached so overlays can read the exact projection this frame produced
  // (the camera math derives them locally in `update`; nothing else stored them). Exposed via `snapshot()`.
  private scale = 1;
  private viewportWidth = 0;
  private viewportHeight = 0;

  // Eases the camera offset toward the focus (my Pokémon, or world centre when I'm absent — spectating, pre-join
  // or fainted) and writes it as a sub-pixel translate + responsive scale on the world layer.
  public update(
    world: HTMLElement,
    parallaxNear: HTMLElement | undefined,
    parallaxMid: HTMLElement | undefined,
    foregroundKelp: HTMLElement | undefined,
  ): void {
    const viewport = world.parentElement;

    if (viewport === null) {
      return;
    }

    const me = this.players.rendered().find((player) => player.isMe);
    const focusX = me?.x ?? 0.5;
    const focusY = me?.y ?? 0.5;
    // The camera math works in on-screen world px = world px × scale (the world layer has transform-origin 0 0,
    // so `translate(cam) scale(s)` puts a child at `f·worldPx·s + cam`). Feed the scaled extents to every axis.
    const scale = cameraScale(
      viewport.clientWidth,
      viewport.clientHeight,
      this.worldWidth,
      this.worldHeight,
    );
    const screenWorldWidth = this.worldWidth * scale;
    const screenWorldHeight = this.worldHeight * scale;

    // Cache the projection inputs for `snapshot()` (overlays read them THIS frame, after `update`).
    this.scale = scale;
    this.viewportWidth = viewport.clientWidth;
    this.viewportHeight = viewport.clientHeight;

    if (this.cameraReady) {
      // Ease toward the dead-zone target: zero motion while the Pokémon stays in the central band, a gentle
      // follow once it crosses an edge.
      const targetX = deadZoneCameraAxis(
        this.camX,
        focusX,
        viewport.clientWidth,
        screenWorldWidth,
        CAMERA_DEAD_ZONE_X_LOW,
        CAMERA_DEAD_ZONE_X_HIGH,
      );
      const targetY = deadZoneCameraAxis(
        this.camY,
        focusY,
        viewport.clientHeight,
        screenWorldHeight,
        CAMERA_DEAD_ZONE_Y_LOW,
        CAMERA_DEAD_ZONE_Y_HIGH,
      );

      this.camX += (targetX - this.camX) * CAMERA_LERP;
      this.camY += (targetY - this.camY) * CAMERA_LERP;
    } else {
      // Open centred on the focus (not the dead-zone, which would leave the world's corner showing).
      this.camX = centerCameraAxis(focusX, viewport.clientWidth, screenWorldWidth);
      this.camY = centerCameraAxis(focusY, viewport.clientHeight, screenWorldHeight);
      this.cameraReady = true;
    }

    // Sub-pixel translate3d + scale on the single composited world layer — smooth on the GPU. No integer
    // rounding here (nor in the position directive): rounding both the camera and each child's offset made their
    // fractional residuals beat against each other into a low-frequency stutter. Scale must come after translate
    // so the offset stays in screen px (origin 0 0).
    this.renderer.setStyle(
      world,
      'transform',
      `translate3d(${this.camX}px, ${this.camY}px, 0) scale(${scale})`,
    );

    // Foreground parallax: shift each layer's tiled pattern by the camera offset, so it drifts only while the
    // viewport scrolls (still during a dead-zone meander) — the subtle travel-direction cue.
    this.setParallax(parallaxNear, PARALLAX_NEAR);
    this.setParallax(parallaxMid, PARALLAX_MID);
    this.setForegroundKelp(foregroundKelp, screenWorldWidth, screenWorldHeight);
  }

  // Frozen read of the current frame's projection state (screen px). Overlays project world points via
  // `x * worldWidth * scale + camX` (and the y analogue) against `viewportWidth/Height`.
  public snapshot(): CameraSnapshot {
    return {
      camX: this.camX,
      camY: this.camY,
      scale: this.scale,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      ready: this.cameraReady,
    };
  }

  // Drive the screen-space foreground kelp: pan horizontally a touch faster than the world (PARALLAX_FRONT) for a
  // near-layer depth cue, and pin its baseline to the on-screen world-floor line (`camY + scaled world height`) so
  // it sits on the seabed and slides off the bottom edge near the surface (floor far below the view). Sized to
  // the scaled world width × a margin so the faster pan never opens a gap at a scroll extreme.
  private setForegroundKelp(
    layer: HTMLElement | undefined,
    screenWorldWidth: number,
    screenWorldHeight: number,
  ): void {
    if (layer === undefined) {
      return;
    }

    this.renderer.setStyle(layer, 'width', `${screenWorldWidth * FOREGROUND_WIDTH_FACTOR}px`);
    this.renderer.setStyle(
      layer,
      'transform',
      `translate(${this.camX * PARALLAX_FRONT}px, ${this.camY + screenWorldHeight}px)`,
    );
  }

  private setParallax(layer: HTMLElement | undefined, factor: number): void {
    if (layer === undefined) {
      return;
    }

    this.renderer.setStyle(
      layer,
      'background-position',
      `${this.camX * factor}px ${this.camY * factor}px`,
    );
  }
}
