import { FRENZY, halfExtentNorm } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import { steerVelocity } from '@game/frenzy/steer-velocity';
import type { Item, NpcPlayer } from '@game/engine/types';
import type { ItemType, NpcKind, PlayerEffectKind } from '@game/frenzy/types';

/** Resting (landed, still-edible) item the NPC is allowed to hunt — D5's benign pool, lying on the seabed. */
function isSeekableTarget(item: Item<ItemType>): boolean {
  const seekTypes: readonly string[] = ANGRY_BOMB_NPC.seekItemTypes;

  return item.restMs !== undefined && item.restMs > 0 && seekTypes.includes(item.type);
}

/** Nearest seekable resting item to `x` (horizontal distance), or undefined when none lie on the floor. */
function nearestEdible(x: number, items: readonly Item<ItemType>[]): Item<ItemType> | undefined {
  let closest: Item<ItemType> | undefined;
  let closestDistance = Infinity;

  for (const item of items) {
    if (!isSeekableTarget(item)) {
      continue;
    }

    const distance = Math.abs(item.x - x);

    if (distance < closestDistance) {
      closest = item;
      closestDistance = distance;
    }
  }

  return closest;
}

/** Size-aware horizontal bounds for the NPC body, matching the side-wall logic in `movePlayers`. */
function horizontalBounds(npc: NpcPlayer<PlayerEffectKind, NpcKind>): {
  minX: number;
  maxX: number;
} {
  const zone = FRENZY.playerDriftZone;
  const insetX = halfExtentNorm(npc.body[npc.stage].width, FRENZY.world.width);

  return { minX: Math.max(zone.minX, insetX), maxX: Math.min(zone.maxX, 1 - insetX) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Frequency ratio of the faster overtone to the base bob. Non-integer so the two harmonics never re-phase into a
 * tight repeating loop — the vertical path reads as organic wander rather than a metronomic sine. */
const BOB_OVERTONE_RATIO = 2.3;
/** Relative weight of the base vs. the overtone; sums to 1 so the combined peak deviation equals `amplitudeY`. */
const BOB_BASE_WEIGHT = 0.7;
const BOB_OVERTONE_WEIGHT = 0.3;

/**
 * Seabed bob for this tick: a small two-harmonic sine around `floorY`. Returns both the `y` offset and the analytic
 * `vy` (norm/sec) so the client's velocity extrapolation tracks the same curve between snapshots instead of stepping.
 */
function floorBob(tick: number, deltaSeconds: number): { offset: number; vy: number } {
  const { amplitudeY, periodTicks } = ANGRY_BOMB_NPC.floorBob;
  const omega = (2 * Math.PI) / periodTicks; // radians per tick
  const phase = omega * tick;
  const offset =
    amplitudeY *
    (Math.sin(phase) * BOB_BASE_WEIGHT +
      Math.sin(phase * BOB_OVERTONE_RATIO) * BOB_OVERTONE_WEIGHT);
  const slopePerTick =
    amplitudeY *
    omega *
    (Math.cos(phase) * BOB_BASE_WEIGHT +
      Math.cos(phase * BOB_OVERTONE_RATIO) * BOB_OVERTONE_RATIO * BOB_OVERTONE_WEIGHT);

  return { offset, vy: slopePerTick / deltaSeconds };
}

/**
 * Drive one angry-bomb NPC along the seabed for this tick (the `NpcRuntime.move` hook — the registry dispatches
 * each NPC of this kind here). Its `y` gently bobs around `floorY` (a small two-harmonic sine, see `floorBob`)
 * so it wanders the sand instead of tracking a ruler-straight line; it never leaves the floor band. It only
 * RE-PICKS a target every `retargetEveryTicks` ticks (steady seek, not a per-tick jitter). On a retarget tick it
 * steers `vx` horizontally toward the nearest resting edible via the shared `steerVelocity` (capped by the
 * stage's `maxSpeed`); with no target in reach it eases to a gentle cruise at the stage's `speed` toward the same
 * side it was already heading. Between retargets it coasts on its current `vx`. `x` advances by `vx·dt` and is
 * clamped to the size-aware side walls. Eating itself happens in the shared collision pass — this only moves it.
 */
export function moveNpc(
  npc: NpcPlayer<PlayerEffectKind, NpcKind>,
  items: readonly Item<ItemType>[],
  deltaSeconds: number,
  tick: number,
): NpcPlayer<PlayerEffectKind, NpcKind> {
  const stageBody = npc.body[npc.stage];
  let { vx } = npc;

  if (tick % ANGRY_BOMB_NPC.retargetEveryTicks === 0) {
    const target = nearestEdible(npc.x, items);

    if (target !== undefined) {
      const dx = target.x - npc.x;

      vx = steerVelocity({ vx, vy: 0 }, dx, 0, {
        impulse: FRENZY.steer.impulse,
        maxSpeed: stageBody.maxSpeed,
      }).vx;
    } else {
      // No food in reach: cruise gently along the floor, keeping the current heading (default rightward when parked).
      const heading = vx === 0 ? 1 : Math.sign(vx);

      vx = heading * stageBody.speed;
    }
  }

  const bounds = horizontalBounds(npc);
  const x = clamp(npc.x + vx * deltaSeconds, bounds.minX, bounds.maxX);

  // Reverse the heading at a wall so it doesn't grind into the edge.
  if ((x === bounds.minX && vx < 0) || (x === bounds.maxX && vx > 0)) {
    vx = -vx;
  }

  const bob = floorBob(tick, deltaSeconds);

  return { ...npc, x, y: ANGRY_BOMB_NPC.floorY + bob.offset, vx, vy: bob.vy };
}
