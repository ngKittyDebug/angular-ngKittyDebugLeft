import { FRENZY } from '@game/frenzy/config';
import type { GameEvent, Player, ServerState } from '@game/frenzy/types';
import { isNPC } from '@game/frenzy/types';

export interface DecayResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Decay step: drains hp from every alive actor, fainting anyone who hits 0. Humans bleed `FRENZY.decayPerTick`;
 * the NPC bleeds its own `FRENZY.npc.decayPerStep` (its starvation clock is tuned independently). A `shield`
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

    const decay = isNPC(player) ? FRENZY.npc.decayPerStep : FRENZY.decayPerTick;
    const newHp = Math.max(0, player.hp - decay);

    // The NPC starving to 0 is NOT removed here: it stays at hp 0 so the later NPC-blast pass can detonate it (a
    // WEAK starvation blast) and own its `fainted`. Humans faint on the spot as before.
    if (newHp <= 0 && !isNPC(player)) {
      events.push({ type: 'fainted', playerId: player.id, cause: { by: 'decay' } });
      continue;
    }

    survivors.push({ ...player, hp: newHp });
  }

  return { state: { ...state, players: survivors }, events };
}
