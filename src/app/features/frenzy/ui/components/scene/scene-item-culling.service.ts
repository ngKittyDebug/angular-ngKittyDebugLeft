import { Injectable, signal } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { visibleNormBounds } from './camera-math';
import type { CameraSnapshot } from './scene-camera.service';
import type { RenderedItem } from './scene-view-models';

// Screen-px slack added around the viewport when deciding which falling items to render. Generous enough that an
// item drifts in already positioned before it scrolls into view (no edge pop-in) and a boundary-straddling item
// doesn't flicker in/out frame to frame, yet small against a wide arena so most far seabed clutter still culls.
// One item sprite is 60px (FRENZY.physicalSizePx.item); ~2.5 sprite-widths of slack covers drift between recomputes.
const ITEM_CULL_MARGIN_PX = 160;

const WORLD_WIDTH = FRENZY.world.width;
const WORLD_HEIGHT = FRENZY.world.height;

/**
 * Decides which falling items lie inside the camera window (+ margin) so the scene can skip rendering the rest —
 * off-screen DOM culling layered on the imperative-position render model (ADR 0001). Recomputed every frame from
 * the live item frame + camera snapshot, but the exposed `visibleIds` signal is re-set ONLY when the visible set
 * actually changes (an item crossed the margin boundary). So change detection fires on boundary crossings, not
 * every frame — keeping issue 01's per-frame-CD-free hot path intact: the in/out test below is cheap pure math,
 * and a stable visible set never touches the signal.
 *
 * `null` means "culling not yet active" (before the camera's first frame, when the snapshot isn't ready): the
 * scene renders every item, so the first paint isn't a blank flash before the rAF loop has run once.
 */
@Injectable()
export class SceneItemCullingService {
  private readonly _visibleIds = signal<ReadonlySet<string> | null>(null);
  // Mirror of the last published set (or null while culling is inactive), kept so each frame can diff membership
  // without reading the signal (a signal read here would tie this writer to change detection).
  private current: ReadonlySet<string> | null = null;

  public readonly visibleIds = this._visibleIds.asReadonly();

  public update(snapshot: CameraSnapshot, itemFrame: readonly RenderedItem[]): void {
    if (!snapshot.ready) {
      return; // hold `null` → render everything until the camera has snapped to its first frame
    }

    const bounds = visibleNormBounds(
      snapshot.camX,
      snapshot.camY,
      snapshot.scale,
      snapshot.viewportWidth,
      snapshot.viewportHeight,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      ITEM_CULL_MARGIN_PX,
    );
    const next = new Set<string>();

    for (const item of itemFrame) {
      if (
        item.x >= bounds.xMin &&
        item.x <= bounds.xMax &&
        item.y >= bounds.yMin &&
        item.y <= bounds.yMax
      ) {
        next.add(item.id);
      }
    }

    if (!sameMembers(this.current, next)) {
      this.current = next;
      this._visibleIds.set(next);
    }
  }
}

// Set equality by membership. `current === null` (the initial render-all state) never matches a computed set, so
// the first ready frame always publishes; otherwise same size + every member of `next` present in `current`.
function sameMembers(current: ReadonlySet<string> | null, next: ReadonlySet<string>): boolean {
  if (current === null || current.size !== next.size) {
    return false;
  }

  for (const id of next) {
    if (!current.has(id)) {
      return false;
    }
  }

  return true;
}
