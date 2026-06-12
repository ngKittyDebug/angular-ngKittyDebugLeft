import { FRENZY, halfExtentNorm, restYFor } from '@game/frenzy/config';
import type { Item } from '@game/frenzy/types';

import { getItemBehavior } from '../item-behaviors';

/**
 * Advances every item by one tick. Resting items (on the floor) count down their `restMs`; falling items move by
 * `vy` (and `vx` for launched easter-egg items, stopping at the size-aware horizontal wall rather than bouncing).
 * On reaching its per-item seabed line (`restYFor` — a hashed y within `itemRestYRange`, so settled items scatter
 * rather than line up) an item settles (`y=restY`, `vy=0`) and gets a `restMs`: 0 for explosives (the onLand pass
 * detonates and removes them this same tick), `FRENZY.itemRestMs` for everything else (lies there, still edible).
 */
export function moveItems(items: readonly Item[], deltaSeconds: number): Item[] {
  const restDeltaMs = deltaSeconds * 1000;
  // Size-aware horizontal wall: hold a launched item's centre half a sprite-width inside each edge so the whole
  // sprite stays within the fixed-size world (no clipping through the aquarium wall) — see FRENZY.world/physicalSizePx.
  const itemHalfWidth = halfExtentNorm(FRENZY.physicalSizePx.item, FRENZY.world.width);

  return items.map((item) => {
    if (item.restMs !== undefined) {
      // Already on the floor — lying there (still edible) while its rest timer counts down.
      return { ...item, restMs: item.restMs - restDeltaMs };
    }

    const y = item.y + item.vy * deltaSeconds;
    const restY = restYFor(item.id);
    const landing = y >= restY;
    // On the landing tick a launched item must only travel the FRACTION of the tick spent before it touches the
    // floor — otherwise it overshoots by a full tick's `vx` and snaps back to the server position on the next
    // snapshot (the "hop into final position" seen on items launched at an angle close to the seabed). The client
    // extrapolator predicts the same fractional touchdown, so matching it here removes that corrective jump.
    const horizontalSeconds =
      landing && item.vy > 0
        ? deltaSeconds * Math.min(1, (restY - item.y) / (item.vy * deltaSeconds))
        : deltaSeconds;
    // Horizontal drift only for launched (easter-egg) items: advance `x` by `vx`, then stop at the size-aware
    // wall and kill `vx` there (rather than bouncing). Plain falling items have no `vx` (stay put).
    let { x, vx } = item;

    if (vx !== undefined && vx !== 0) {
      x += vx * horizontalSeconds;

      if (x <= itemHalfWidth) {
        x = itemHalfWidth;
        vx = 0;
      } else if (x >= 1 - itemHalfWidth) {
        x = 1 - itemHalfWidth;
        vx = 0;
      }
    }

    if (landing) {
      // Reached its seabed line: settle there and stop falling. Explosives detonate on contact (restMs 0 →
      // handled and removed this same tick by the onLand pass); everything else rests, still edible, then expires.
      const restMs = getItemBehavior(item.type).onLand === undefined ? FRENZY.itemRestMs : 0;

      return { ...item, x, vx, y: restY, vy: 0, restMs };
    }

    return { ...item, x, vx, y };
  });
}
