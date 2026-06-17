import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { sandPuffWeightFor } from '../../constants/pokemon-registry';
import type { RenderedItem, SandPuff } from './scene-view-models';

// How long a sand puff lives before removal (ms). Matches the CSS settle/fade animation (longest grain
// animation + its max launch delay).
const PUFF_LIFETIME_MS = 1200;
// Items are centre-anchored on their `y` (matching the server's collision centre), so the sprite's bottom edge —
// where it meets the sand — sits half an item height BELOW `y`. Drop the puff there so the dust kicks up from the
// item's base, not its middle.
const ITEM_HALF_NORM = FRENZY.physicalSizePx.item / 2 / FRENZY.world.height;

/**
 * Owns the short-lived sand puffs kicked up where a falling item touches the seabed: the rendered list, the
 * removal timers and their teardown. Pure of the DOM so it is unit-tested directly.
 *
 * Spawning is rising-edge detected from the scene's rendered items, fed once per frame via `observe`: a puff
 * fires only when an item that was previously seen mid-air (`landed: false`) flips to `landed: true` — so an item
 * that arrives already rested (server `restMs`, never fell on-screen) does NOT puff, nor does one re-confirmed
 * landed every subsequent frame. Intensity comes from the item type's `sandPuffWeightFor` (a 0 weight would
 * suppress the puff; the heaviest debris — rock/brick/bomb — kicks up the most). Skipped under `prefers-reduced-motion`.
 */
@Injectable()
export class SceneSandPuffsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _puffs = signal<readonly SandPuff[]>([]);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  // Last seen `landed` per item id, so we can detect the false→true transition (the actual touchdown frame).
  private readonly landedById = new Map<string, boolean>();
  private counter = 0;

  public readonly puffs = this._puffs.asReadonly();

  public constructor() {
    this.destroyRef.onDestroy(() => {
      for (const timer of this.timers) {
        clearTimeout(timer);
      }
    });
  }

  // Called each animation frame with the freshly extrapolated items: detect touchdowns and prune vanished ids.
  public observe(items: readonly RenderedItem[]): void {
    const seen = new Set<string>();

    for (const item of items) {
      seen.add(item.id);

      const previousLanded = this.landedById.get(item.id);

      // Rising edge only: it was airborne last frame and just touched down now. A first-seen already-landed item
      // (previousLanded === undefined) is skipped — it rested before it ever reached the screen.
      if (previousLanded === false && item.landed) {
        this.spawn(item.x, item.y, item.type);
      }

      this.landedById.set(item.id, item.landed);
    }

    for (const id of this.landedById.keys()) {
      if (!seen.has(id)) {
        this.landedById.delete(id);
      }
    }
  }

  private spawn(x: number, y: number, type: RenderedItem['type']): void {
    const weight = sandPuffWeightFor(type);

    if (weight <= 0 || this.prefersReducedMotion()) {
      return;
    }

    const id = ++this.counter;

    this._puffs.update((puffs) => [...puffs, { id, type, x, y: y + ITEM_HALF_NORM, weight }]);

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this._puffs.update((puffs) => puffs.filter((puff) => puff.id !== id));
    }, PUFF_LIFETIME_MS);

    this.timers.add(timer);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
