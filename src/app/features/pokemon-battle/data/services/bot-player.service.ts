import { Injectable } from '@angular/core';
import type { BattleCommand, BattleState } from '@game/pokemon-battle/types';

@Injectable({
  providedIn: 'root',
})
export class BotPlayerService {
  /**
   * Generates random valid commands for all alive active bot pokemons.
   */
  public getCommands(state: BattleState): BattleCommand[] {
    const commands: BattleCommand[] = [];

    // Get alive active player pokemon IDs as potential targets
    const alivePlayerTargets = state.playerSide.activePokemonIds.filter((id) => {
      const p = state.playerSide.pokemons.find((poke) => poke.id === id);

      return p && p.hp > 0;
    });

    if (alivePlayerTargets.length === 0) {
      return commands;
    }

    // Generate command for each active opponent (bot) pokemon
    for (const id of state.opponentSide.activePokemonIds) {
      const pokemon = state.opponentSide.pokemons.find((poke) => poke.id === id);

      if (!pokemon || pokemon.hp <= 0) {
        continue;
      }

      if (pokemon.moves.length === 0) {
        continue;
      }

      const randomMoveIndex = Math.floor(Math.random() * pokemon.moves.length);
      const move = pokemon.moves[randomMoveIndex];

      const randomTargetIndex = Math.floor(Math.random() * alivePlayerTargets.length);
      const targetId = alivePlayerTargets[randomTargetIndex];

      commands.push({
        pokemonId: id,
        moveName: move.name,
        targetId,
      });
    }

    return commands;
  }
}
