import { inject, Injectable } from '@angular/core';

import type { Item, Player } from '@game/frenzy/types';

import { ItemExtrapolatorService } from './item-extrapolator.service';
import { PlayerExtrapolatorService } from './player-extrapolator.service';
import { SceneBurstsService } from './scene-bursts.service';
import { SceneCameraService } from './scene-camera.service';

/**
 * Single entry point for the scene's render-loop logic, grouping the extrapolation, camera and burst services so
 * the component stays a thin view shell (refs, the rAF loop and pointer events). `ingest*` re-anchor from a fresh
 * snapshot (driven by the input effects); `tick*` + `updateCamera` run every animation frame.
 */
@Injectable()
export class SceneFacade {
  private readonly items = inject(ItemExtrapolatorService);
  private readonly players = inject(PlayerExtrapolatorService);
  private readonly camera = inject(SceneCameraService);
  private readonly burstsService = inject(SceneBurstsService);

  public readonly renderedItems = this.items.rendered;
  public readonly renderedPlayers = this.players.rendered;
  public readonly bursts = this.burstsService.bursts;

  public ingestItems(items: readonly Item[], now: number): void {
    this.items.ingest(items, now);
  }

  public ingestPlayers(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.players.ingest(players, myId, evolving, now);
  }

  public tickItems(items: readonly Item[], now: number): void {
    this.items.tick(items, now);
  }

  public tickPlayers(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.players.tick(players, myId, evolving, now);
  }

  public updateCamera(
    world: HTMLElement,
    parallaxNear: HTMLElement | undefined,
    parallaxMid: HTMLElement | undefined,
  ): void {
    this.camera.update(world, parallaxNear, parallaxMid);
  }

  public spawnBurst(x: number, y: number): void {
    this.burstsService.spawn(x, y);
  }

  public predictSteer(myId: string | null, x: number, y: number, now: number): void {
    this.players.predictSteer(myId, x, y, now);
  }
}
