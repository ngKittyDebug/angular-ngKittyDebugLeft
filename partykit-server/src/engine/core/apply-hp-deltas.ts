import type { GameDefinition } from '@game/engine/definition';
import type { FaintCause, GameEvent, Player, ServerState } from '@game/engine/types';

import { calculateStage } from './calculate-stage';
import { damageTakenMultiplier } from './effect-modifiers';
import type { HpDelta } from '../verbs';

export interface HpDeltaResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  events: GameEvent<TItemId, TEffectId>[];
}

/** Outcome of applying a player's net hp change: the updated player (absent when they fainted) and any event it produced. */
interface PlayerHpOutcome<TItemId extends string, TEffectId extends string, TNpcId extends string> {
  player?: Player<TEffectId, TNpcId>;
  event?: GameEvent<TItemId, TEffectId>;
}

/**
 * Rescales a velocity to the target speed, keeping its direction. Used on evolution so a grown player cruises
 * at its new stage's `speed` instead of carrying the smaller stage's momentum. A near-zero velocity (parked) gets
 * a default heading so it doesn't stay frozen at the new size.
 */
function renormalizeVelocity(vx: number, vy: number, speed: number): { vx: number; vy: number } {
  const magnitude = Math.hypot(vx, vy);

  if (magnitude === 0) {
    return { vx: speed, vy: 0 };
  }

  return { vx: (vx / magnitude) * speed, vy: (vy / magnitude) * speed };
}

/** Groups the deltas per player, so one target hit by several deltas in a tick resolves against a single net amount. */
function groupByPlayer(deltas: readonly HpDelta[]): Map<string, HpDelta[]> {
  const deltasByPlayer = new Map<string, HpDelta[]>();

  for (const delta of deltas) {
    const bucket = deltasByPlayer.get(delta.playerId) ?? [];

    bucket.push(delta);
    deltasByPlayer.set(delta.playerId, bucket);
  }

  return deltasByPlayer;
}

/**
 * Nets a player's deltas, scaling each DAMAGE (negative) delta by the product of the player's active
 * `damageTaken[source]` effect multipliers — a full ward (all sources 0) nullifies the hit (covers plain item
 * damage and negative gamble rolls; a blast is already filtered at `computeBlast`). Positive deltas apply
 * unscaled, so feeding through a ward still grows. NOTE: this per-delta ward generalizes the historical
 * net-amount ward; today every call site passes single-sign per-player batches, so the two are identical — a
 * future producer batching mixed-sign deltas would let a heal through a full ward where the old code froze the
 * whole net.
 */
function netAmount<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  player: Player<TEffectId, TNpcId>,
  deltas: readonly HpDelta[],
): number {
  return deltas.reduce(
    (sum, delta) =>
      sum +
      (delta.amount < 0
        ? delta.amount * damageTakenMultiplier(game.effects, player.effects, delta.source)
        : delta.amount),
    0,
  );
}

/**
 * Applies one player's net hp change: clamps at 0, recomputes stage. Returns no player (and a `fainted` event)
 * when the hp reaches 0, an `evolved` event when a stage threshold is crossed.
 */
function resolvePlayerHp<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  maxHp: number,
  player: Player<TEffectId, TNpcId>,
  amount: number,
  cause?: FaintCause<TItemId>,
): PlayerHpOutcome<TItemId, TEffectId, TNpcId> {
  const newHp = Math.max(0, Math.min(maxHp, player.hp + amount));

  if (newHp <= 0) {
    return { event: { type: 'fainted', playerId: player.id, ...(cause && { cause }) } };
  }

  const newStage = calculateStage(newHp, player.body);

  if (newStage > player.stage) {
    // Grew a stage: emit `evolved` and recruise at the new stage's speed so the bigger body doesn't keep the
    // smaller one's momentum (or stay slow).
    const { vx, vy } = renormalizeVelocity(player.vx, player.vy, player.body[newStage].speed);

    return {
      player: { ...player, hp: newHp, stage: newStage, vx, vy },
      event: { type: 'evolved', playerId: player.id, newStage },
    };
  }

  return { player: { ...player, hp: newHp, stage: newStage }, event: undefined };
}

/**
 * Applies hp changes to players: scales damage by the target's `damageTaken` effect multipliers, clamps at 0,
 * recomputes stage, removes anyone who hits 0.
 * Emits `evolved` when a player crosses a stage threshold and `fainted` when they reach 0.
 * Shared by click (eating) and any landing/collateral effect, so it handles one or many targets.
 * `cause` is the killing-blow attribution stamped on each `fainted` event. A single `FaintCause` covers a one-item
 * interaction (one item → one cause) where the whole batch shares it; a resolver function `(playerId) => cause`
 * covers a batch with a per-victim culprit (player-vs-player bumps, where each victim's killer is its own rammer).
 * Decay deaths are built elsewhere.
 */
export function applyHpDeltas<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  deltas: HpDelta[],
  cause?: FaintCause<TItemId> | ((playerId: string) => FaintCause<TItemId> | undefined),
): HpDeltaResult<TItemId, TEffectId, TNpcId> {
  if (deltas.length === 0) {
    return { state, events: [] };
  }

  const deltasByPlayer = groupByPlayer(deltas);
  const events: GameEvent<TItemId, TEffectId>[] = [];
  const players: Player<TEffectId, TNpcId>[] = [];

  for (const player of state.players) {
    const playerDeltas = deltasByPlayer.get(player.id);

    if (playerDeltas === undefined) {
      players.push(player);
      continue;
    }

    const rawNet = playerDeltas.reduce((sum, delta) => sum + delta.amount, 0);
    const net = netAmount(game, player, playerDeltas);

    // A fully warded pure-damage hit is a no-op: keep the player object UNTOUCHED — including a stage left
    // stale-high by decay (which drains hp without recomputing stages), which a stage recompute here would
    // silently demote. Exactly the historical ward short-circuit's semantics.
    if (rawNet < 0 && net === 0) {
      players.push(player);
      continue;
    }

    const resolvedCause = typeof cause === 'function' ? cause(player.id) : cause;
    const outcome = resolvePlayerHp(game.hp.maxHp, player, net, resolvedCause);

    if (outcome.player !== undefined) {
      players.push(outcome.player);
    }

    if (outcome.event !== undefined) {
      events.push(outcome.event);
    }
  }

  return { state: { ...state, players }, events };
}
