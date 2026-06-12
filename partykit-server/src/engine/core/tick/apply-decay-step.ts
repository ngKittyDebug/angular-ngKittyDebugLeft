import type { GameDefinition } from '@game/engine/definition';
import type { GameEvent, Player, ServerState } from '@game/engine/types';
import { isNPC } from '@game/engine/types';

import { isDecayPaused } from '../effect-modifiers';

export interface DecayResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  events: GameEvent<TItemId, TEffectId>[];
}

/**
 * Decay step: drains hp from every alive actor, fainting anyone who hits 0. Humans bleed `hp.decayPerTick`;
 * an NPC bleeds its own definition's `decayPerStep` (its starvation clock is tuned independently). Any active
 * effect declaring `modifiers.decayPaused` suspends the bleed entirely — damage wards and decay pauses are
 * separate concerns. Only invoked on decay ticks (the loop schedules them).
 */
export function applyDecayStep<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
): DecayResult<TItemId, TEffectId, TNpcId> {
  const events: GameEvent<TItemId, TEffectId>[] = [];
  const survivors: Player<TEffectId, TNpcId>[] = [];

  for (const player of state.players) {
    if (isDecayPaused(game.effects, player.effects)) {
      survivors.push(player);
      continue;
    }

    const decay = isNPC(player) ? game.npcs[player.npcKind].decayPerStep : game.hp.decayPerTick;
    const newHp = Math.max(0, player.hp - decay);

    // An NPC starving to 0 is NOT removed here: it stays at hp 0 so the later NPC-blast pass can detonate it (a
    // WEAK starvation blast) and own its `fainted`. Humans faint on the spot as before.
    if (newHp <= 0 && !isNPC(player)) {
      events.push({ type: 'fainted', playerId: player.id, cause: { by: 'decay' } });
      continue;
    }

    survivors.push({ ...player, hp: newHp });
  }

  return { state: { ...state, players: survivors }, events };
}
