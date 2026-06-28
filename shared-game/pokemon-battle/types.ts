export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface PokemonMove {
  name: string;
  type: string;
  power: number;
}

export interface BattlePokemon {
  id: number;
  name: string;
  maxHp: number;
  hp: number;
  stats: PokemonStats;
  types: string[];
  sprites: {
    front: string;
    back: string;
  };
  moves: PokemonMove[];
}

export interface BattleSide {
  playerType: 'player' | 'bot';
  pokemons: BattlePokemon[];
  activePokemonIds: number[];
}

export interface BattleState {
  playerSide: BattleSide;
  opponentSide: BattleSide;
  status: 'initializing' | 'waiting-for-commands' | 'resolving-turn' | 'finished';
  winner: 'player' | 'opponent' | null;
  turn: number;
}
