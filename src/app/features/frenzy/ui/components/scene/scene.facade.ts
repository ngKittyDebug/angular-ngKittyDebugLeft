import { inject, Injectable } from '@angular/core';

import type { Item, Player } from '@game/frenzy/types';

import { ItemExtrapolatorService } from './item-extrapolator.service';
import { PlayerExtrapolatorService } from './player-extrapolator.service';
import { SceneActorRegistryService } from './scene-actor-registry.service';
import { SceneBurstsService } from './scene-bursts.service';
import { SceneCameraService } from './scene-camera.service';
import type { CameraSnapshot } from './scene-camera.service';
import type { RenderedItem, RenderedPlayer } from './scene-view-models';
import { SceneSandPuffsService } from './scene-sand-puffs.service';

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

  public readonly renderedItems = this.items.rendered;
  public readonly renderedPlayers = this.players.rendered;
  public readonly bursts = this.burstsService.bursts;
  public readonly sandPuffs = this.sandPuffsService.puffs;

  public ingestItems(items: readonly Item[], now: number): void {
    this.items.ingest(items, now);
    // Position existing item hosts on the corrected snapshot, and store this frame so an item appearing on THIS
    // snapshot is placed immediately when its host registers (no origin pop-in). See ADR 0001.
    this.registry.writeItems(this.items.frame());
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

  public tickItems(items: readonly Item[], now: number): void {
    this.items.tick(items, now);
    // Write the freshly extrapolated positions straight to the DOM (off change detection).
    this.registry.writeItems(this.items.frame());
    // Rising-edge sand puffs are driven off the freshly extrapolated items (touchdowns), so detect right after.
    this.sandPuffsService.observe(this.items.frame());
  }

  public tickPlayers(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.players.tick(players, myId, evolving, now);
    this.registry.writePlayers(this.players.frame());
  }

  // The live per-frame player view models — for the `?debug=perf` panel, which must measure the optimized render
  // path (the imperative positions), not the rarely-republished structure signal.
  public playerFrame(): readonly RenderedPlayer[] {
    return this.players.frame();
  }

  // The live per-frame item view models — for the off-screen item culling, which tests each item's current
  // (extrapolated) position against the camera window every frame (see SceneItemCullingService).
  public itemFrame(): readonly RenderedItem[] {
    return this.items.frame();
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
