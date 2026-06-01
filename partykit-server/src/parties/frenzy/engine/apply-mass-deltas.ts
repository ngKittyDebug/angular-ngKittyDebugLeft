import type { GameEvent, Player, ServerState } from '@game/frenzy/types';

import { calculateStage } from './calculate-stage';
import type { MassDelta } from './item-behaviors';

export interface MassDeltaResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Applies mass changes to players: clamps at 0, recomputes stage, removes anyone who hits 0.
 * Emits `evolved` when a player crosses a stage threshold and `fainted` when they reach 0.
 * Shared by click (eating) and any landing/collateral effect, so it handles one or many targets.
 */
export function applyMassDeltas(state: ServerState, deltas: MassDelta[]): MassDeltaResult {
  if (deltas.length === 0) {
    return { state, events: [] };
  }

  const amountByPlayer = new Map<string, number>();

  for (const delta of deltas) {
    amountByPlayer.set(delta.playerId, (amountByPlayer.get(delta.playerId) ?? 0) + delta.amount);
  }

  const events: GameEvent[] = [];
  const players: Player[] = [];

  for (const player of state.players) {
    const amount = amountByPlayer.get(player.id);

    if (amount === undefined) {
      players.push(player);
      continue;
    }

    const newMass = Math.max(0, player.mass + amount);

    if (newMass <= 0) {
      events.push({ type: 'fainted', playerId: player.id });
      continue;
    }

    const newStage = calculateStage(newMass);

    if (newStage > player.stage) {
      events.push({ type: 'evolved', playerId: player.id, newStage });
    }

    players.push({ ...player, mass: newMass, stage: newStage });
  }

  return { state: { ...state, players }, events };
}
