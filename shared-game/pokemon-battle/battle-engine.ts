import type { BattlePokemon, BattleState } from './types';

export class BattleEngine {
  private state: BattleState;

  constructor(
    playerPokemons: BattlePokemon[],
    opponentPokemons: BattlePokemon[],
    isDoubles = false,
  ) {
    this.state = {
      playerSide: {
        playerType: 'player',
        pokemons: playerPokemons.map((p) => ({ ...p, hp: p.hp ?? p.maxHp })),
        activePokemonIds: playerPokemons.slice(0, isDoubles ? 2 : 1).map((p) => p.id),
      },
      opponentSide: {
        playerType: 'bot',
        pokemons: opponentPokemons.map((p) => ({ ...p, hp: p.hp ?? p.maxHp })),
        activePokemonIds: opponentPokemons.slice(0, isDoubles ? 2 : 1).map((p) => p.id),
      },
      status: 'waiting-for-commands',
      winner: null,
      turn: 1,
    };
  }

  public getState(): BattleState {
    return this.state;
  }
}
