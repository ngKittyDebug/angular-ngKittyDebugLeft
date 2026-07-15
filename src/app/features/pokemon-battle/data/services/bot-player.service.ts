import { Injectable } from '@angular/core';
import type { BattleCommand, BattleState } from '../models/battle.model';

@Injectable({
  providedIn: 'root',
})
export class BotPlayerService {
  /**
   * Generates random valid commands for all alive active bot pokemons.
   */
  public getCommandList(state: BattleState): BattleCommand[] {
    const commandList: BattleCommand[] = [];

    // Get alive active player pokemon IDs as potential targets
    const alivePlayerTargetList = state.playerSide.activePokemonIds.filter((id) => {
      const p = state.playerSide.pokemons.find((poke) => poke.id === id);

      return p && p.hp > 0;
    });

    if (alivePlayerTargetList.length === 0) {
      return commandList;
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

      const randomTargetIndex = Math.floor(Math.random() * alivePlayerTargetList.length);
      const targetId = alivePlayerTargetList[randomTargetIndex];

      commandList.push({
        pokemonId: id,
        moveName: move.name,
        targetId,
      });
    }

    return commandList;
  }
}
