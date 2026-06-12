import { Injectable, signal } from '@angular/core';

import { FRENZY, halfExtentNorm } from '@game/frenzy/config';
import type { Item } from '@game/frenzy/types';

import { spinFor } from './item-spin';
import type { RenderedItem } from './scene-view-models';

// Items extrapolate on two independent timelines so a launched (easter-egg) item can fly sideways while
// falling, yet a bomb nudge (horizontal only) never disturbs the vertical fall. Vertical is set once at spawn
// (`y = min(1, y0 + vy·tV)`); horizontal re-anchors on every server x/vx change — nudge, edge-stop, snapshot —
// (`x = clamp(x0 + vx·tH)`), then freezes the instant the item lands so it doesn't slide along the floor.
interface ItemBaseline {
  x0: number;
  vx: number;
  hStart: number;
  y0: number;
  vy: number;
  vStart: number;
}

// Mirror the server's size-aware horizontal wall (engine/tick/move-items.ts): hold an item's centre half a
// sprite-width inside each edge so the whole sprite stays on-scene. Clamping to the raw [0,1] would anchor the
// centre on the wall (the `translate(-50%)` foot hangs half the sprite outside) until the next snapshot — and
// the corrective snap to the server's inset rest position is the one-time jitter seen on edge landings.
const ITEM_HALF_WIDTH = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.width);

/**
 * Client-side extrapolation of falling items between server snapshots. Owns the per-item baselines and publishes
 * the rendered positions; pure of the DOM so it is unit-tested directly. `ingest` re-anchors from a fresh
 * snapshot; `tick` re-publishes each animation frame without re-anchoring.
 */
@Injectable()
export class ItemExtrapolatorService {
  private readonly baselines = new Map<string, ItemBaseline>();
  private readonly _rendered = signal<readonly RenderedItem[]>([]);

  public readonly rendered = this._rendered.asReadonly();

  // Re-anchor baselines from a fresh snapshot, then publish the extrapolated positions.
  public ingest(items: readonly Item[], now: number): void {
    const currentIds = new Set<string>();

    for (const item of items) {
      currentIds.add(item.id);

      const vx = item.vx ?? 0;
      const baseline = this.baselines.get(item.id);

      if (baseline === undefined) {
        this.baselines.set(item.id, {
          x0: item.x,
          vx,
          hStart: now,
          y0: item.y,
          vy: item.vy,
          vStart: now,
        });
      } else if (baseline.x0 !== item.x || baseline.vx !== vx) {
        // The server moved the item horizontally — a bomb nudge, a launched item advancing across snapshots,
        // or an edge-stop that zeroed vx. Re-anchor the horizontal timeline only; the vertical fall keeps its
        // own clock so a sideways correction never makes the item jump up or down.
        baseline.x0 = item.x;
        baseline.vx = vx;
        baseline.hStart = now;
      }
    }

    for (const id of this.baselines.keys()) {
      if (!currentIds.has(id)) {
        this.baselines.delete(id);
      }
    }

    this._rendered.set(this.compute(items, now));
  }

  // Per-frame republish (rAF loop): advance each item along its existing baseline without re-anchoring.
  public tick(items: readonly Item[], now: number): void {
    this._rendered.set(this.compute(items, now));
  }

  private compute(items: readonly Item[], now: number): RenderedItem[] {
    return items.map((item) => {
      const baseline = this.baselines.get(item.id);
      const x0 = baseline?.x0 ?? item.x;
      const vx = baseline?.vx ?? item.vx ?? 0;
      const hStart = baseline?.hStart ?? now;
      const y0 = baseline?.y0 ?? item.y;
      const vy = baseline?.vy ?? item.vy;
      const vStart = baseline?.vStart ?? now;

      const y = Math.min(1, y0 + vy * ((now - vStart) / 1000));
      // Horizontal stops the moment the item lands: clamp the horizontal clock at the landing instant
      // (when `y` would reach 1), so a launched item rides its arc down then sticks where it touches the
      // floor instead of sliding. A server-rested item (restMs set) is already frozen at its anchor `x0`.
      const landTimeMs = vy > 0 ? vStart + ((1 - y0) / vy) * 1000 : now;
      const hEnd = item.restMs === undefined ? Math.min(now, landTimeMs) : hStart;
      const x = Math.min(
        Math.max(x0 + vx * (Math.max(0, hEnd - hStart) / 1000), ITEM_HALF_WIDTH),
        1 - ITEM_HALF_WIDTH,
      );
      const spin = spinFor(item.id, item.type);

      return {
        id: item.id,
        type: item.type,
        x,
        y,
        // Reached the floor (rendered or server-rested) → freeze the tumble.
        landed: y >= 1 || item.restMs !== undefined,
        spinDurationMs: spin.durationMs,
        spinReverse: spin.reverse,
      };
    });
  }
}
