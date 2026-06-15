import type { EmissionSpec, GameDefinition } from '@game/engine/definition';
import type { Item, ServerState } from '@game/engine/types';

import { pickItemType } from './pick-item-type';

/** One emitting aura, resolved once at engine creation: the effect kind, its emission spec and a bound pool picker. */
export interface Emitter<TItemId extends string = string, TEffectId extends string = string> {
  kind: TEffectId;
  emission: EmissionSpec;
  pickType: (rng: () => number) => TItemId;
}

/**
 * The emitting auras, derived from the effect definitions: every effect carrying an `emission` spec, in the
 * definition's DECLARATION ORDER — which is the priority. For a player the FIRST matching active effect wins, so
 * an actor that somehow holds two emitting auras can never emit twice in one tick. Each aura sprays its OWN
 * curated pool (`emission.poolId`, resolved here once — not the world pool), still respecting the items'
 * `enabled` feature flags. Built once per engine (`createEngine`), NOT per tick.
 */
export function buildEmitters<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(game: GameDefinition<TItemId, TEffectId, TNpcId>): readonly Emitter<TItemId, TEffectId>[] {
  const isEnabled = (type: TItemId): boolean => game.items[type].enabled;

  return (Object.keys(game.effects) as TEffectId[]).flatMap((kind) => {
    const emission = game.effects[kind].emission;

    if (emission === undefined) {
      return [];
    }

    const pool = game.spawnPools[emission.poolId];

    return [
      {
        kind,
        emission,
        pickType: (rng: () => number): TItemId => pickItemType(rng, isEnabled, pool),
      },
    ];
  });
}

export interface EmissionResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  /** Newly emitted items, so the caller can broadcast a `spawned` event per item. */
  spawned: Item<TItemId>[];
  /** Next-emit schedule rebuilt from this tick's live aura holders (`playerId -> nextEmitAt`, server-clock ms). The
   * caller stores it back; players without an aura (dead/gone/expired) drop out, so the map self-prunes. */
  schedule: Map<string, number>;
}

/**
 * Item emissions: each alive player under an emitting aura drips ONE falling item every `emission.intervalMs` —
 * a steady, predictable drip rather than a random per-tick burst. The timing lives in the injected `schedule` map
 * (`playerId -> nextEmitAt`), kept server-side off the wire. Each tick a fresh `schedule` is built from the current
 * aura holders: a holder seen for the first time arms its timer (`now + interval`) and emits nothing this tick
 * (first item lands one interval after the pickup); a holder whose timer is due (`now >= nextEmitAt`) emits and
 * re-arms on the EXACT grid (`due + interval`, not `now + interval`, so drift never accumulates and at most one
 * item drops per player per tick); a holder not yet due carries its timer forward; a player without an aura (or
 * dead/gone) drops out of the map → auto-clean, and a returning holder re-arms fresh.
 *
 * The item spawns at the body's lower-rear EDGE — offset by half the body size (so it clears the sprite at any stage)
 * plus a small gap behind the heading and below the bottom edge — and is launched backward (opposite the heading) with
 * a small random angle jitter (`launch.angleJitter`), so successive emissions fan out in a cone behind the emitter rather
 * than lining up along the exact same line. Emitted items carry `ownerId`, so the emitter is immune to them (collision
 * and blast skip the owner). Pure — `now`/`schedule` drive timing; `rng` and `createId` are injected for tests.
 */
export function applyEmissions<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  emitters: readonly Emitter<TItemId, TEffectId>[],
  state: ServerState<TItemId, TEffectId, TNpcId>,
  now: number,
  schedule: ReadonlyMap<string, number>,
  rng: () => number = Math.random,
  createId: () => string = () => crypto.randomUUID(),
): EmissionResult<TItemId, TEffectId, TNpcId> {
  const spawned: Item<TItemId>[] = [];
  const next = new Map<string, number>();
  const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

  for (const player of state.players) {
    if (player.status !== 'alive') {
      continue;
    }

    // First matching emitter wins — a player can never double-emit even if holding both auras.
    const emitter = emitters.find((candidate) =>
      player.effects.some((effect) => effect.kind === candidate.kind),
    );

    if (emitter === undefined) {
      continue;
    }

    const interval = emitter.emission.intervalMs;
    const due = schedule.get(player.id);

    if (due === undefined) {
      // First tick under the aura: arm the timer, emit nothing yet (first item lands one interval later).
      next.set(player.id, now + interval);
      continue;
    }

    if (now < due) {
      // Not due yet — carry the timer forward unchanged.
      next.set(player.id, due);
      continue;
    }

    // Due — emit one item and re-arm on the exact grid so the count stays precise and drift never accumulates.
    next.set(player.id, due + interval);

    const type = emitter.pickType(rng);
    // Heading: +1 facing right, -1 facing left (default right when idle). Items fly the opposite way (behind).
    const heading = player.vx < 0 ? -1 : 1;
    // Spawn from the body edge, not the centre: half the body size (normalized) + a small gap behind/below.
    const stageBody = player.body[player.stage];
    const halfWidthNorm = stageBody.width / 2 / game.world.width;
    const halfHeightNorm = stageBody.height / 2 / game.world.height;
    // A heavy item (e.g. a drifting mine with its own low speed cap) overrides the aura's launch speed via its
    // `physics.emitLaunchSpeed`, so it eases out near its cap instead of shooting out and snapping back; light
    // items keep the aura's shared `launch.backSpeed`.
    const physics = game.items[type].physics;
    const backSpeed = physics.emitLaunchSpeed ?? emitter.emission.launch.backSpeed;
    // Base launch: backward (opposite heading) + downward. Rotate the vector by a small random angle so successive
    // emissions fan out in a cone instead of every item flying the identical way and lining up (most obvious with
    // heavy explosives). Rotation preserves the launch speed, so a capped drifter stays under its drift cap.
    const baseVx = -heading * backSpeed;
    const baseVy = physics.fallSpeed;
    const angle = (rng() - 0.5) * 2 * emitter.emission.launch.angleJitter;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    spawned.push({
      id: createId(),
      type,
      x: clamp01(player.x - heading * (halfWidthNorm + emitter.emission.launch.back)),
      y: clamp01(player.y + halfHeightNorm + emitter.emission.launch.down),
      vx: baseVx * cos - baseVy * sin,
      vy: baseVx * sin + baseVy * cos,
      ownerId: player.id,
    });
  }

  if (spawned.length === 0) {
    return { state, spawned, schedule: next };
  }

  return { state: { ...state, items: [...state.items, ...spawned] }, spawned, schedule: next };
}
