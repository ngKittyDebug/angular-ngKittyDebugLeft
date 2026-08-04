import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
  viewChildren,
} from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

import type { CameraSnapshot } from '../scene/camera/scene-camera.service';
import type { RenderedPlayer } from '../scene/scene-view-models';
import {
  clusterEdgeArrows,
  edgeHit,
  isOffscreen,
  projectToScreen,
} from './offscreen-indicator-math';
import type { EdgeArrowGroup, EdgeArrowInput, ScreenPoint, Side } from './offscreen-indicator-math';
import { OFFSCREEN_INDICATORS } from './offscreen-indicators.config';

const WORLD_WIDTH = FRENZY.world.width;
const WORLD_HEIGHT = FRENZY.world.height;

interface ArrowVm {
  key: string;
  side: Side;
  memberIds: readonly string[];
  name: string | null;
  count: number;
}

/**
 * Screen-space HUD overlay: a name badge per off-screen player (alive humans only), riding the nearest viewport
 * edge and sliding along it to track the player — the edge it sits on is the direction. Crowded badges collapse
 * into count-badges (Google-Maps-marker style) — chiefly a mobile win, where the small camera window pushes most of
 * the roster off-screen.
 *
 * Mirrors the scene's "render once from signals, animate via Renderer2" split (the project is zone.js, so a
 * per-frame `signal.set()` would drag change detection back into the rAF loop):
 * - STRUCTURE (which badges, name-vs-count, cluster membership) is recomputed at a low rate and pushed to the
 *   `indicatorList` signal — the only Angular work. `@for` adds/removes nodes by stable membership key.
 * - POSITION (the edge slide) is written EVERY frame by `frame()` via Renderer2, off the live camera snapshot, so
 *   it tracks the smoothly-eased pan 1:1 with no CSS transition (which would rubber-band) and no CD.
 *
 * Positions are passed into `frame()` by the scene's render loop — the same rendered player VMs the sprites use,
 * glided through reconciliation — NOT injected from the scene's extrapolator (no sibling-into-guts, ADR 0004 §5)
 * and NOT the raw server snapshot (which steps at the tick rate and made the arrows jump). Player names are read
 * from the raw `playerList` input (the rendered VM carries only the species label), keyed by id. `frame()` runs from
 * the scene's single rAF loop right after the camera and the player tick, so both read the same frame. Decorative
 * real-time aid → `aria-hidden`: the authoritative roster/leaderboard already exposes presence to AT, and arrows
 * mutating ~8×/s would be screen-reader noise.
 */
@Component({
  selector: 'left-paw-offscreen-indicators',
  templateUrl: './offscreen-indicators.component.html',
  styleUrl: './offscreen-indicators.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffscreenIndicatorsComponent {
  private readonly renderer = inject(Renderer2);
  private readonly arrowElements = viewChildren('arrow', { read: ElementRef });
  // Last structural recompute (performance.now ms); throttled to `structureHz`.
  private lastStructureAt = 0;

  // Raw roster — used only for id→name (the rendered VM carries the species label, not the player's chosen name).
  // Smooth positions come from the rendered VMs the loop passes into `frame()`, not from here.
  public readonly playerList = input.required<readonly Player[]>();

  protected readonly indicatorList = signal<readonly ArrowVm[]>([]);

  // Called once per frame by the scene rAF loop after the camera writes its transform, with the loop's current
  // rendered player VMs. Repositions every existing arrow off them, then re-derives membership at the throttled rate.
  public frame(camera: CameraSnapshot, now: number, rendered: readonly RenderedPlayer[]): void {
    if (!camera.ready || camera.viewportWidth === 0 || camera.viewportHeight === 0) {
      if (this.indicatorList().length > 0) {
        this.indicatorList.set([]);
      }

      return;
    }

    this.position(camera, rendered);

    if (now - this.lastStructureAt >= 1000 / OFFSCREEN_INDICATORS.structureHz) {
      this.lastStructureAt = now;
      this.restructure(camera, rendered);
    }
  }

  // Re-derive which arrows exist and their clustering from the current (extrapolated) positions. Sets the signal
  // only when the membership keys actually change — names/counts are fully determined by membership.
  private restructure(camera: CameraSnapshot, rendered: readonly RenderedPlayer[]): void {
    const nameById = new Map(this.playerList().map((player) => [player.id, player.name]));
    const inputs: EdgeArrowInput[] = [];

    for (const player of rendered) {
      if (player.isMe || player.isNpc || player.isDisconnected) {
        continue;
      }

      const screen = projectToScreen(player.x, player.y, WORLD_WIDTH, WORLD_HEIGHT, camera);

      if (!isOffscreen(screen, camera.viewportWidth, camera.viewportHeight)) {
        continue;
      }

      const hit = edgeHit(
        screen,
        camera.viewportWidth,
        camera.viewportHeight,
        OFFSCREEN_INDICATORS.edgeMarginPx,
      );

      inputs.push({
        id: player.id,
        name: nameById.get(player.id) ?? player.label,
        side: hit.side,
        t: hit.t,
      });
    }

    const groups = clusterEdgeArrows(
      inputs,
      OFFSCREEN_INDICATORS.clusterDistancePx,
      OFFSCREEN_INDICATORS.maxNamedArrows,
    );

    if (this.sameMembership(groups)) {
      return;
    }

    this.indicatorList.set(groups.map(toVm));
  }

  // Per-frame DOM write: slide each arrow to its members' (averaged) edge point and rotate the glyph to their mean
  // bearing. Sub-pixel, no rounding (like the camera/position directive). A just-added node may not be in the DOM
  // yet (the structural `signal.set` renders after this synchronous frame) — skip it; next frame catches it.
  private position(camera: CameraSnapshot, rendered: readonly RenderedPlayer[]): void {
    const elements = this.elementsByKey();

    if (elements.size === 0) {
      return;
    }

    const renderedById = new Map(rendered.map((player) => [player.id, player]));

    for (const vm of this.indicatorList()) {
      const element = elements.get(vm.key);

      if (element === undefined) {
        continue;
      }

      const offscreen = this.offscreenMembers(vm, renderedById, camera);

      if (offscreen.length === 0) {
        this.renderer.setStyle(element, 'opacity', '0');
        continue;
      }

      let edgeX = 0;
      let edgeY = 0;

      for (const screen of offscreen) {
        const hit = edgeHit(
          screen,
          camera.viewportWidth,
          camera.viewportHeight,
          OFFSCREEN_INDICATORS.edgeMarginPx,
        );

        edgeX += hit.x;
        edgeY += hit.y;
      }

      const count = offscreen.length;

      this.renderer.setStyle(element, 'translate', `${edgeX / count}px ${edgeY / count}px`);
      this.renderer.setStyle(element, 'opacity', '1');
    }
  }

  // The live screen positions of a group's members that are currently still off-screen (a member can drift back
  // on-screen between structural ticks — exclude it from the badge's placement until the next restructure drops it).
  private offscreenMembers(
    vm: ArrowVm,
    renderedById: ReadonlyMap<string, RenderedPlayer>,
    camera: CameraSnapshot,
  ): ScreenPoint[] {
    const points: ScreenPoint[] = [];

    for (const id of vm.memberIds) {
      const player = renderedById.get(id);

      if (player === undefined) {
        continue;
      }

      const screen = projectToScreen(player.x, player.y, WORLD_WIDTH, WORLD_HEIGHT, camera);

      if (isOffscreen(screen, camera.viewportWidth, camera.viewportHeight)) {
        points.push(screen);
      }
    }

    return points;
  }

  private elementsByKey(): Map<string, HTMLElement> {
    const map = new Map<string, HTMLElement>();

    for (const reference of this.arrowElements()) {
      const element = reference.nativeElement as HTMLElement;
      const key = element.dataset['key'];

      if (key !== undefined) {
        map.set(key, element);
      }
    }

    return map;
  }

  private sameMembership(groups: readonly EdgeArrowGroup[]): boolean {
    const current = this.indicatorList();

    if (current.length !== groups.length) {
      return false;
    }

    return current.every((vm, index) => vm.key === groups[index].key);
  }
}

function toVm(group: EdgeArrowGroup): ArrowVm {
  return {
    key: group.key,
    side: group.side,
    memberIds: group.memberIds,
    name: group.name,
    count: group.count,
  };
}
