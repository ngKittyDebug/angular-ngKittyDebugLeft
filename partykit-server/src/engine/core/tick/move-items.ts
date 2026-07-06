import type { GameDefinition } from '@game/engine/definition';
import { halfExtentNorm, rescaleVelocity, restYFor } from '@game/engine/geometry';
import type { Item } from '@game/engine/types';

/** Whether an item declares an ACTIONABLE landing verb (explosives) — they get `restMs: 0` and detonate the
 * same tick. A `none` onLand matches an omitted one (the landing pass ignores both), so the item still rests. */
function landsWithABang<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
): boolean {
  const onLand = game.items[item.type].interactions.onLand;

  return onLand !== undefined && onLand.verb !== 'none';
}

/**
 * Nudgeable-item drift (the mine): unlike a plain falling item it carries full `vx`/`vy` and drifts at CONSTANT
 * velocity (no gravity) — exactly like a steered player, so the client extrapolates it with the same constant-velocity
 * reflect and the vertical reads as smooth as the horizontal (gravity used to accelerate `vy` server-side only, which
 * the client couldn't mirror → per-snapshot vertical jitter). It bounces (damped, reusing `bounceDamping`) off the side
 * and top walls; only the floor is terminal (settles → `restMs: 0`, so the onLand pass detonates and removes it this
 * same tick). It still sinks because it spawns with a downward `vy` and coasts. `halfWidth`/`halfHeight` keep the
 * whole sprite on-scene (size-aware walls), matching the client extrapolator.
 */
function driftItem<TItemId extends string>(
  item: Item<TItemId>,
  deltaSeconds: number,
  halfWidth: number,
  halfHeight: number,
  damping: { wall: number; floor: number },
  maxDriftSpeed: number,
  restYRange: readonly [number, number],
): Item<TItemId> {
  let vx = item.vx ?? 0;
  let vy = item.vy;

  let x = item.x + vx * deltaSeconds;
  let y = item.y + vy * deltaSeconds;

  if (x <= halfWidth) {
    x = halfWidth;
    vx = Math.abs(vx) * damping.wall;
  } else if (x >= 1 - halfWidth) {
    x = 1 - halfWidth;
    vx = -Math.abs(vx) * damping.wall;
  }

  if (y <= halfHeight) {
    y = halfHeight;
    vy = Math.abs(vy) * damping.wall;
  }

  // Hard ceiling on the item's overall speed (clicks are already capped in applyClick; this also catches wall
  // bounces): it never moves faster than the nudge spec's `maxDriftSpeed` in any direction. With no gravity the
  // velocity only changes on a shove or a bounce, so this cap is the sole speed limit.
  const speed = Math.hypot(vx, vy);

  if (speed > maxDriftSpeed) {
    ({ vx, vy } = rescaleVelocity(vx, vy, maxDriftSpeed));
  }

  const restY = restYFor(item.id, restYRange);

  if (y >= restY) {
    // Reached the floor: settle and flag for the onLand detonation pass (restMs 0 → handled + removed this tick).
    return { ...item, x, vx, y: restY, vy: 0, restMs: 0 };
  }

  return { ...item, x, vx, y, vy };
}

/**
 * Advances every item by one tick. Resting items (on the floor) count down their `restMs`; falling items move by
 * `vy` (and `vx` for launched emitted items, stopping at the size-aware horizontal wall rather than bouncing).
 * On reaching its per-item floor line (`restYFor` — a hashed y within `spawn.restYRange`, so settled items scatter
 * rather than line up) an item settles (`y=restY`, `vy=0`) and gets a `restMs`: 0 for explosives (the onLand pass
 * detonates and removes them this same tick), `spawn.restMs` for everything else (lies there, still edible).
 */
export function moveItems<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  items: readonly Item<TItemId>[],
  deltaSeconds: number,
): Item<TItemId>[] {
  const restDeltaMs = deltaSeconds * 1000;
  // Size-aware horizontal wall: hold a launched item's centre half a sprite-width inside each edge so the whole
  // sprite stays within the fixed-size world (no clipping through the wall) — see `world`/`itemSizePx`.
  const itemHalfWidth = halfExtentNorm(game.world.itemSizePx, game.world.width);
  const itemHalfHeight = halfExtentNorm(game.world.itemSizePx, game.world.height);

  return items.map((item) => {
    if (item.restMs !== undefined) {
      // Already on the floor — lying there (still edible) while its rest timer counts down.
      return { ...item, restMs: item.restMs - restDeltaMs };
    }

    const onClick = game.items[item.type].interactions.onClick;

    if (onClick.verb === 'nudge') {
      // A nudgeable item is a drifting physics object (constant-velocity 2D drift + wall bounce), not a straight faller.
      return driftItem(
        item,
        deltaSeconds,
        itemHalfWidth,
        itemHalfHeight,
        game.player.bounceDamping,
        onClick.maxDriftSpeed,
        game.spawn.restYRange,
      );
    }

    const y = item.y + item.vy * deltaSeconds;
    const restY = restYFor(item.id, game.spawn.restYRange);
    const landing = y >= restY;
    // On the landing tick a launched item must only travel the FRACTION of the tick spent before it touches the
    // floor — otherwise it overshoots by a full tick's `vx` and snaps back to the server position on the next
    // snapshot (the "hop into final position" seen on items launched at an angle close to the floor). The client
    // extrapolator predicts the same fractional touchdown, so matching it here removes that corrective jump.
    const horizontalSeconds =
      landing && item.vy > 0
        ? deltaSeconds * Math.min(1, (restY - item.y) / (item.vy * deltaSeconds))
        : deltaSeconds;
    // Horizontal drift only for launched (aura-emitted) items: advance `x` by `vx`, then stop at the size-aware
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
      // Reached its floor line: settle there and stop falling. Explosives detonate on contact (restMs 0 →
      // handled and removed this same tick by the onLand pass); everything else rests, still edible, then expires.
      const restMs = landsWithABang(game, item) ? 0 : game.spawn.restMs;

      return { ...item, x, vx, y: restY, vy: 0, restMs };
    }

    return { ...item, x, vx, y };
  });
}
