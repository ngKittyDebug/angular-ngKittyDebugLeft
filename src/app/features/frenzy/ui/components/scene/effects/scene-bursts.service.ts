import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { BubbleBurst } from '../scene-view-models';

// How long a click bubble-burst lives before it is removed (ms). Matches the CSS animation.
const BURST_LIFETIME_MS = 1000;

/**
 * Owns the short-lived decorative bubble-burst spawned at each press point: the rendered list, the removal
 * timers and their teardown. The scene computes the normalized press point (it owns the world rect) and hands it
 * here; the burst self-removes after its CSS animation. This is the *miss* cue (open water); the dense converging
 * variant for a successful hit is driven separately, server-confirmed, via `HitBurstEffect`.
 */
@Injectable()
export class SceneBurstsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _burstList = signal<readonly BubbleBurst[]>([]);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private counter = 0;

  public readonly burstList = this._burstList.asReadonly();

  public constructor() {
    this.destroyRef.onDestroy(() => {
      for (const timer of this.timers) {
        clearTimeout(timer);
      }
    });
  }

  public spawn(x: number, y: number): void {
    const id = ++this.counter;

    this._burstList.update((burstList) => [...burstList, { id, x, y }]);

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this._burstList.update((burstList) => burstList.filter((burst) => burst.id !== id));
    }, BURST_LIFETIME_MS);

    this.timers.add(timer);
  }
}
