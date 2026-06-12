import { FRENZY } from '@game/frenzy/config';
import type { GameEvent, Player, ServerState } from '@game/frenzy/types';

export interface DecayResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Decay step: drains `FRENZY.decayPerTick` hp from every alive Pokémon, fainting anyone who hits 0. A `shield`
 * (full ward) or `wellFed` (vitamin) suspends the bleed entirely while active — they differ on damage (shield
 * blocks it, wellFed doesn't), but not on decay. Only invoked on decay ticks (the loop schedules them).
 */
export function applyDecayStep(state: ServerState): DecayResult {
  const events: GameEvent[] = [];
  const survivors: Player[] = [];

  for (const player of state.players) {
    if (player.effects.some((effect) => effect.kind === 'shield' || effect.kind === 'wellFed')) {
      survivors.push(player);
      continue;
    }

    const newHp = Math.max(0, player.hp - FRENZY.decayPerTick);

    if (newHp <= 0) {
      events.push({ type: 'fainted', playerId: player.id, cause: { by: 'decay' } });
      continue;
    }

    survivors.push({ ...player, hp: newHp });
  }

  return { state: { ...state, players: survivors }, events };
}
