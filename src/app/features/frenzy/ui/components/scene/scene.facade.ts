import { inject, Injectable } from '@angular/core';

import type { Item, Player } from '@game/frenzy/types';

import { ItemExtrapolatorService } from './prediction/item-extrapolator.service';
import { PlayerExtrapolatorService } from './prediction/player-extrapolator.service';
import { SceneActorRegistryService } from './rendering/dom/scene-actor-registry.service';
import { SceneBurstsService } from './effects/scene-bursts.service';
import { SceneCameraService } from './camera/scene-camera.service';
import type { CameraSnapshot } from './camera/scene-camera.service';
import { SceneDecorCanvasService } from './rendering/canvas/scene-decor-canvas.service';
import { SceneActorCanvasService } from './rendering/canvas/scene-actor-canvas.service';
import type { RenderedItem, RenderedPlayer } from './scene-view-models';
import { SceneSandPuffsService } from './effects/scene-sand-puffs.service';

/**
 * Single entry point for the scene's render-loop logic, grouping the extrapolation, camera and burst services so
 * the component stays a thin view shell (refs, the rAF loop and pointer events). `ingest*` re-anchor from a fresh
 * snapshot (driven by the input effects); `tick*` + `updateCamera` run every animation frame.
 */
@Injectable()
export class SceneFacade {
  private readonly items = inject(ItemExtrapolatorService);
  private readonly players = inject(PlayerExtrapolatorService);
  private readonly registry = inject(SceneActorRegistryService);
  private readonly camera = inject(SceneCameraService);
  private readonly burstsService = inject(SceneBurstsService);
  private readonly sandPuffsService = inject(SceneSandPuffsService);
  private readonly actorCanvas = inject(SceneActorCanvasService);
  private readonly decorCanvas = inject(SceneDecorCanvasService);

  public readonly renderedItemList = this.items.renderedList;
  public readonly renderedPlayerList = this.players.renderedList;
  public readonly burstList = this.burstsService.burstList;
  public readonly sandPuffList = this.sandPuffsService.puffList;

  public ingestItems(items: readonly Item[], now: number): void {
    this.items.ingest(items, now);
    // Position existing item hosts on the corrected snapshot, and store this frame so an item appearing on THIS
    // snapshot is placed immediately when its host registers (no origin pop-in). See ADR 0001.
    this.registry.writeItems(this.items.frame(), this.camera.visibleBounds());
  }

  public ingestPlayers(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.players.ingest(players, myId, evolving, now);
    this.registry.writePlayers(this.players.frame());
  }

  public tickItems(items: readonly Item[], now: number, drawCanvas: boolean): void {
    this.items.tick(items, now);

    const frame = this.items.frame();
    // Pass the camera's visible bounds so off-screen items skip the write/draw (soft cull) — one frame stale here
    // (tickItems runs before updateCamera in the rAF loop), which the cull margin absorbs.
    const bounds = this.camera.visibleBounds();

    // Always write DOM item hosts: in DOM mode that's every item, in canvas mode only the bomb has a host (the rest
    // have no DOM node, so they're skipped) — so the bomb stays positioned even when the canvas draws the rest.
    this.registry.writeItems(frame, bounds);

    // Canvas backend: draw the non-bomb items on the single canvas (it filters the bomb out itself).
    if (drawCanvas) {
      this.actorCanvas.draw(frame, bounds, now);
    }

    // Rising-edge sand puffs are driven off the freshly extrapolated items (touchdowns), so detect right after.
    this.sandPuffsService.observe(frame);
  }

  // Canvas decor backend (ADR 0007): draw the backdrop kelp on its canvas. Uses the camera's visible bounds to skip
  // off-screen blade columns — one frame stale here (runs before updateCamera in the loop), absorbed by the cull margin.
  // `skipPlants` forwards the canvas-mode `noPlants` decor probe so the device A/B can attribute the blade fill cost.
  public tickDecor(now: number, skipPlants: boolean): void {
    this.decorCanvas.draw(this.camera.visibleBounds(), now, skipPlants);
  }

  // The live per-frame item view models — for the canvas hit-test, which needs the current drawn positions (not the
  // throttled `renderedItemList` structure signal, which lags a falling item between snapshots).
  public itemFrame(): readonly RenderedItem[] {
    return this.items.frame();
  }

  public tickPlayers(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
    drawPlayersCanvas: boolean,
    itemsDrewCanvas: boolean,
  ): void {
    this.players.tick(players, myId, evolving, now);

    const frame = this.players.frame();

    // Always write the DOM chrome positions (hp/crown/name/auras/shadow ride the registry in lockstep with the
    // canvas sprite, in both modes).
    this.registry.writePlayers(frame);

    // Canvas backend: draw the player sprites on the shared actors-canvas, on top of the items. Clear it first only
    // when the items pass didn't (items in DOM mode) — so items and players share ONE clear per frame, items first.
    if (drawPlayersCanvas) {
      this.actorCanvas.drawPlayers(frame, this.camera.visibleBounds(), now, !itemsDrewCanvas);
    }
  }

  // The live per-frame player view models — for the `?debug=perf` panel, which must measure the optimized render
  // path (the imperative positions), not the rarely-republished structure signal.
  public playerFrame(): readonly RenderedPlayer[] {
    return this.players.frame();
  }

  // Mirror the current frame into the structure signals — used only by the `?debug` box overlay so its boxes track
  // the sprites every frame (a dev tool; the per-frame change detection it reintroduces is acceptable there).
  public publishDebugFrame(): void {
    this.items.publishFrame();
    this.players.publishFrame();
  }

  public updateCamera(
    world: HTMLElement,
    parallaxNear: HTMLElement | undefined,
    parallaxMid: HTMLElement | undefined,
    foregroundKelp: HTMLElement | undefined,
  ): void {
    this.camera.update(world, parallaxNear, parallaxMid, foregroundKelp);
  }

  // The camera's current-frame projection state, for the off-screen indicators overlay (read right after
  // `updateCamera` so both share the frame).
  public cameraSnapshot(): CameraSnapshot {
    return this.camera.snapshot();
  }

  public spawnBurst(x: number, y: number): void {
    this.burstsService.spawn(x, y);
  }

  public predictSteer(myId: string | null, x: number, y: number, now: number): void {
    this.players.predictSteer(myId, x, y, now);
  }
}
