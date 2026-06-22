import { Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { withinNormBounds } from '../../camera/camera-math';
import type { VisibleNormBounds } from '../../camera/camera-math';
import type { RenderedItem, RenderedPlayer } from '../../scene-view-models';
import type { ItemWriteTally } from '../shared/actor-write-tally';

// World px size — the actors' offsetParent (`.scene__world`) is set to exactly this many px, so a normalized
// (0..1) position maps to px by a constant multiply, with no per-frame layout read (the directive this replaces
// measured `offsetParent.clientWidth` every write).
const WORLD_WIDTH = FRENZY.world.width;
const WORLD_HEIGHT = FRENZY.world.height;

// Custom property carrying the player's facing on the host (inherits to `.scene__sprite-flip`): 1 = left/default,
// -1 = mirrored right. Set imperatively here, off change detection, instead of via a per-frame `[class]`/`[style]`
// binding — see scene-player.component.scss.
const FACING_PROPERTY = '--scene-facing';
const FACING_LEFT = '1';
const FACING_RIGHT = '-1';

/**
 * Imperative position/flag writer for the scene's drifting actors (falling items, players and each player's
 * owned-float column). The hot path: every animation frame the scene feeds the freshly extrapolated frame here and
 * this writes each registered host's `translate` (plus the player facing flip) straight to the DOM — bypassing
 * Angular change detection, which would otherwise re-run every actor child component every frame just to nudge it a
 * few px (the weak-tablet FPS bottleneck). Hosts register via `ActorHostDirective`; registration positions the
 * element immediately from the last frame so an actor entering mid-game never paints one frame at the origin.
 *
 * Position and the facing flip are the ONLY per-frame visuals taken off change detection. Everything structural
 * (sprite/auras/badges/hp, and an item's landed shadow/sand-clip/spin-freeze) still rides the `@for` and re-renders
 * only when it actually changes — see ADR 0001.
 */
@Injectable()
export class SceneActorRegistryService {
  private readonly items = new Map<string, HTMLElement>();
  private readonly players = new Map<string, HTMLElement>();
  private readonly floats = new Map<string, HTMLElement>();
  // Last inline value actually written per element, so a per-frame write that wouldn't change anything is skipped —
  // the bulk of the savings, since landed items and settled sprites hold one position/facing for many frames (the
  // on-screen clusters that set the FPS floor). WeakMap: an unregistered element's entry is collected with the
  // element, no manual cleanup. The browser's own same-value early-out isn't guaranteed for inline writes, and the
  // style/compositor work they trigger happens AFTER our rAF callback (invisible to the `loop` metric), so we gate here.
  private readonly lastTranslate = new WeakMap<HTMLElement, string>();
  private readonly lastFacing = new WeakMap<HTMLElement, string>();
  private lastItemFrame: readonly RenderedItem[] = [];
  private lastPlayerFrame: readonly RenderedPlayer[] = [];
  // Per-frame item write accounting, updated every `writeItems` (two int increments per item, no allocation — read
  // only under the `?debug=perf` gate). See `writeTally`.
  private itemFrameSize = 0;
  private writtenItems = 0;
  private skippedItems = 0;

  public registerItem(id: string, element: HTMLElement): void {
    this.items.set(id, element);

    const vm = this.lastItemFrame.find((item) => item.id === id);

    if (vm !== undefined) {
      this.writeTranslate(element, vm.x, vm.y);
    }
  }

  public unregisterItem(id: string): void {
    this.items.delete(id);
  }

  public registerPlayer(id: string, element: HTMLElement): void {
    this.players.set(id, element);

    const vm = this.lastPlayerFrame.find((player) => player.id === id);

    if (vm !== undefined) {
      this.writeTranslate(element, vm.x, vm.y);
      this.writeFacing(element, vm.facingRight);
    }
  }

  public unregisterPlayer(id: string): void {
    this.players.delete(id);
  }

  public registerFloat(id: string, element: HTMLElement): void {
    this.floats.set(id, element);

    const vm = this.lastPlayerFrame.find((player) => player.id === id);

    if (vm !== undefined) {
      this.writeTranslate(element, vm.x, vm.y);
    }
  }

  public unregisterFloat(id: string): void {
    this.floats.delete(id);
  }

  // Per-frame write for falling items: position only (landed/spin are structural, kept on change detection).
  // `visible` (when given) soft-culls: items outside the camera viewport + margin keep their DOM node (NO view
  // churn — unlike conditional render) but skip the translate write, the dominant per-frame cost. A frozen item
  // resumes the moment it re-enters the margin band, before it's truly visible, so the freeze is never seen.
  public writeItems(
    frame: readonly RenderedItem[],
    visible: VisibleNormBounds | null = null,
  ): void {
    this.lastItemFrame = frame;

    let written = 0;
    let skipped = 0;

    for (const item of frame) {
      const element = this.items.get(item.id);

      if (element === undefined) {
        continue;
      }

      if (visible === null || withinNormBounds(item.x, item.y, visible)) {
        this.writeTranslate(element, item.x, item.y);
        written += 1;
      } else {
        skipped += 1;
      }
    }

    this.itemFrameSize = frame.length;
    this.writtenItems = written;
    this.skippedItems = skipped;
  }

  // The last frame's item write accounting — for the `?debug=perf` census only.
  public writeTally(): ItemWriteTally {
    return { total: this.itemFrameSize, written: this.writtenItems, skipped: this.skippedItems };
  }

  // Per-frame write for players: position + the facing flip (a pure visual flag, kept off change detection), plus
  // the owned-float column that rides each sprite's drift (anchored on the same body point).
  public writePlayers(frame: readonly RenderedPlayer[]): void {
    this.lastPlayerFrame = frame;

    for (const player of frame) {
      const element = this.players.get(player.id);

      if (element !== undefined) {
        this.writeTranslate(element, player.x, player.y);
        this.writeFacing(element, player.facingRight);
      }

      const floatColumn = this.floats.get(player.id);

      if (floatColumn !== undefined) {
        this.writeTranslate(floatColumn, player.x, player.y);
      }
    }
  }

  private writeTranslate(element: HTMLElement, x: number, y: number): void {
    // The `translate` CSS property (NOT `transform`) — composes with the element's static centring `transform`
    // anchor and updates on the compositor with no layout/reflow, exactly as the directive it replaces did.
    const value = `${x * WORLD_WIDTH}px ${y * WORLD_HEIGHT}px`;

    // Skip when unchanged: a landed item or a settled sprite holds one position for many frames, so re-setting the
    // same value is a pure-waste compositor commit on exactly the clusters that pin the FPS floor.
    if (this.lastTranslate.get(element) === value) {
      return;
    }

    this.lastTranslate.set(element, value);
    element.style.translate = value;
  }

  private writeFacing(element: HTMLElement, facingRight: boolean): void {
    const value = facingRight ? FACING_RIGHT : FACING_LEFT;

    // Skip when unchanged: a custom-property inline write invalidates style for the inheriting sprite subtree (it
    // feeds `scaleX(var(--scene-facing))`), forcing a per-player style recalc. Facing only flips on a direction
    // change, so writing every frame recalc'd every sprite for nothing.
    if (this.lastFacing.get(element) === value) {
      return;
    }

    this.lastFacing.set(element, value);
    element.style.setProperty(FACING_PROPERTY, value);
  }
}
