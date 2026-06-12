import { FRENZY } from '@game/frenzy/config';
import type { FaintCause, GameEvent, Player, ServerState } from '@game/frenzy/types';

import { calculateStage } from './calculate-stage';
import type { HpDelta } from './item-behaviors';

export interface HpDeltaResult {
  state: ServerState;
  events: GameEvent[];
}

/** Outcome of applying a player's net hp change: the updated player (absent when they fainted) and any event it produced. */
interface PlayerHpOutcome {
  player?: Player;
  event?: GameEvent;
}

/**
 * Rescales a velocity to the target speed, keeping its direction. Used on evolution so a grown Pokémon cruises
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

/** Sums the deltas per player, so one target hit by several deltas in a tick resolves against a single net amount. */
function aggregateByPlayer(deltas: readonly HpDelta[]): Map<string, number> {
  const amountByPlayer = new Map<string, number>();

  for (const delta of deltas) {
    amountByPlayer.set(delta.playerId, (amountByPlayer.get(delta.playerId) ?? 0) + delta.amount);
  }

  return amountByPlayer;
}

/**
 * Applies one player's net hp change: clamps at 0, recomputes stage. A `shield` (vitamin ward) nullifies a
 * net-negative amount — the player keeps their hp and can't faint from a hit (covers rock, rotten and negative
 * mushroom rolls; bomb is already filtered at the blast). Positive deltas still apply, so feeding through a
 * shield still grows. Returns no player (and a `fainted` event) when the hp reaches 0, an `evolved` event when
 * a stage threshold is crossed.
 */
function resolvePlayerHp(player: Player, amount: number, cause?: FaintCause): PlayerHpOutcome {
  const shielded = player.effects.some((effect) => effect.kind === 'shield');

  if (shielded && amount < 0) {
    return { player };
  }

  const newHp = Math.max(0, Math.min(FRENZY.maxHp, player.hp + amount));

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
 * Applies hp changes to players: clamps at 0, recomputes stage, removes anyone who hits 0.
 * Emits `evolved` when a player crosses a stage threshold and `fainted` when they reach 0.
 * Shared by click (eating) and any landing/collateral effect, so it handles one or many targets.
 * `cause` is the killing-blow attribution stamped on each `fainted` event: every call here resolves a single
 * item interaction (one item → one cause), so the whole batch shares it; decay deaths are built elsewhere.
 */
export function applyHpDeltas(
  state: ServerState,
  deltas: HpDelta[],
  cause?: FaintCause,
): HpDeltaResult {
  if (deltas.length === 0) {
    return { state, events: [] };
  }

  const amountByPlayer = aggregateByPlayer(deltas);
  const events: GameEvent[] = [];
  const players: Player[] = [];

  for (const player of state.players) {
    const amount = amountByPlayer.get(player.id);

    if (amount === undefined) {
      players.push(player);
      continue;
    }

    const outcome = resolvePlayerHp(player, amount, cause);

    if (outcome.player !== undefined) {
      players.push(outcome.player);
    }

    if (outcome.event !== undefined) {
      events.push(outcome.event);
    }
  }

  return { state: { ...state, players }, events };
}
