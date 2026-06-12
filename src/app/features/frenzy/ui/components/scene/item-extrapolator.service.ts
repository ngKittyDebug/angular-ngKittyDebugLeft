import { Injectable, signal } from '@angular/core';

import { FRENZY, halfExtentNorm, restYFor } from '@game/frenzy/config';
import type { Item } from '@game/frenzy/types';

import { clamp, decayedOffset, OFFSET_DECAY_TAU_MS, reflect } from './drift-math';
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
  // Bomb-only reconciliation (mirrors the player extrapolator): the on-screen gap (rendered − authoritative)
  // captured at the last re-anchor and decayed toward 0, so a shove — a velocity change the client never predicted
  // — glides in instead of snapping. Zero for plain fallers (never carried) and on a bomb's first sight.
  offsetX: number;
  offsetY: number;
  offsetStamp: number;
}

// Mirror the server's size-aware horizontal wall (engine/tick/move-items.ts): hold an item's centre half a
// sprite-width inside each edge so the whole sprite stays on-scene. Clamping to the raw [0,1] would anchor the
// centre on the wall (the `translate(-50%)` foot hangs half the sprite outside) until the next snapshot — and
// the corrective snap to the server's inset rest position is the one-time jitter seen on edge landings.
const ITEM_HALF_WIDTH = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.width);
// Same size-aware top wall on the vertical axis — keeps the bomb's reflective drift from clipping the ceiling.
const ITEM_HALF_HEIGHT = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.height);

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
          offsetX: 0,
          offsetY: 0,
          offsetStamp: now,
        });
      } else if (item.type === 'bomb') {
        // The bomb re-anchors both axes together each snapshot, carrying the on-screen gap forward as a decaying
        // offset (mirrors the player extrapolator) so a shove — a velocity change the client never predicted —
        // glides in over ~3τ instead of snapping. In steady drift the client already matches the server, so the
        // gap is ~0 and the offset is inert.
        const moved =
          baseline.x0 !== item.x ||
          baseline.vx !== vx ||
          baseline.y0 !== item.y ||
          baseline.vy !== item.vy;

        if (moved) {
          const restY = restYFor(item.id);
          const dtMs = now - baseline.offsetStamp;
          // The ACTUALLY-rendered (clamped, offset-adjusted) position right now — same expression `compute` uses —
          // so the carried gap is the true on-screen discrepancy, not an out-of-zone overshoot.
          const renderedX = clamp(
            reflect(
              baseline.x0,
              baseline.vx,
              Math.max(0, now - baseline.hStart) / 1000,
              ITEM_HALF_WIDTH,
              1 - ITEM_HALF_WIDTH,
            ) + decayedOffset(baseline.offsetX, dtMs, OFFSET_DECAY_TAU_MS),
            ITEM_HALF_WIDTH,
            1 - ITEM_HALF_WIDTH,
          );
          const renderedY = clamp(
            Math.min(
              restY,
              Math.max(
                ITEM_HALF_HEIGHT,
                baseline.y0 + baseline.vy * ((now - baseline.vStart) / 1000),
              ),
            ) + decayedOffset(baseline.offsetY, dtMs, OFFSET_DECAY_TAU_MS),
            ITEM_HALF_HEIGHT,
            restY,
          );

          baseline.offsetX = renderedX - item.x;
          baseline.offsetY = renderedY - item.y;
          baseline.offsetStamp = now;
          baseline.x0 = item.x;
          baseline.vx = vx;
          baseline.hStart = now;
          baseline.y0 = item.y;
          baseline.vy = item.vy;
          baseline.vStart = now;
        }
      } else if (baseline.x0 !== item.x || baseline.vx !== vx) {
        // The server moved a plain faller horizontally — a launched item advancing across snapshots, or an
        // edge-stop that zeroed vx. Re-anchor the horizontal timeline; its vertical fall keeps its own clock so a
        // sideways correction never makes the item jump up or down.
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

      if (item.type === 'bomb') {
        return this.renderBomb(item, baseline, now);
      }

      const x0 = baseline?.x0 ?? item.x;
      const vx = baseline?.vx ?? item.vx ?? 0;
      const hStart = baseline?.hStart ?? now;
      const y0 = baseline?.y0 ?? item.y;
      const vy = baseline?.vy ?? item.vy;
      const vStart = baseline?.vStart ?? now;

      // Per-item seabed line (same hash the server settles at, so the fall stops at the identical y — no snap on
      // the confirming snapshot, and settled items scatter rather than stack on y=1).
      const restY = restYFor(item.id);
      const spin = spinFor(item.id, item.type);

      const y = Math.min(restY, y0 + vy * ((now - vStart) / 1000));
      // Horizontal stops the moment the item lands: clamp the horizontal clock at the landing instant
      // (when `y` would reach `restY`), so a launched item rides its arc down then sticks where it touches the
      // floor instead of sliding. A server-rested item (restMs set) is already frozen at its anchor `x0`.
      const landTimeMs = vy > 0 ? vStart + ((restY - y0) / vy) * 1000 : now;
      const hEnd = item.restMs === undefined ? Math.min(now, landTimeMs) : hStart;
      const x = Math.min(
        Math.max(x0 + vx * (Math.max(0, hEnd - hStart) / 1000), ITEM_HALF_WIDTH),
        1 - ITEM_HALF_WIDTH,
      );

      return {
        id: item.id,
        type: item.type,
        x,
        y,
        // Reached its seabed line (rendered or server-rested) → freeze the tumble.
        landed: y >= restY || item.restMs !== undefined,
        spinDurationMs: spin.durationMs,
        spinReverse: spin.reverse,
      };
    });
  }

  // Bomb render: constant-velocity 2D drift (reflective horizontal bounce + vertical sink toward the seabed, no
  // gravity) plus the decaying reconciliation offset captured on each re-anchor (see `ingest`), so an unpredicted
  // shove glides in over ~3τ instead of snapping. `landed` flips at the seabed line for the rising-edge sand puff.
  private renderBomb(item: Item, baseline: ItemBaseline | undefined, now: number): RenderedItem {
    const x0 = baseline?.x0 ?? item.x;
    const vx = baseline?.vx ?? item.vx ?? 0;
    const hStart = baseline?.hStart ?? now;
    const y0 = baseline?.y0 ?? item.y;
    const vy = baseline?.vy ?? item.vy;
    const vStart = baseline?.vStart ?? now;
    const restY = restYFor(item.id);
    const spin = spinFor(item.id, item.type);
    const dtMs = baseline === undefined ? 0 : now - baseline.offsetStamp;
    const offsetX =
      baseline === undefined ? 0 : decayedOffset(baseline.offsetX, dtMs, OFFSET_DECAY_TAU_MS);
    const offsetY =
      baseline === undefined ? 0 : decayedOffset(baseline.offsetY, dtMs, OFFSET_DECAY_TAU_MS);
    const bx = clamp(
      reflect(x0, vx, Math.max(0, now - hStart) / 1000, ITEM_HALF_WIDTH, 1 - ITEM_HALF_WIDTH) +
        offsetX,
      ITEM_HALF_WIDTH,
      1 - ITEM_HALF_WIDTH,
    );
    const by = clamp(
      Math.min(restY, Math.max(ITEM_HALF_HEIGHT, y0 + vy * ((now - vStart) / 1000))) + offsetY,
      ITEM_HALF_HEIGHT,
      restY,
    );

    return {
      id: item.id,
      type: item.type,
      x: bx,
      y: by,
      landed: by >= restY || item.restMs !== undefined,
      spinDurationMs: spin.durationMs,
      spinReverse: spin.reverse,
      // Authoritative drift speed (from the last snapshot's vx/vy) for the `?debug` speed readout.
      debugSpeed: Math.hypot(vx, vy).toFixed(4),
      // Carried through for the sensor-light "armed" chase speed (undefined for aura-emitted mines).
      clicksLeft: item.clicksLeft,
    };
  }
}
