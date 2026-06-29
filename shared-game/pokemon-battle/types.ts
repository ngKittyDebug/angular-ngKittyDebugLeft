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

export interface BattleCommand {
  pokemonId: number;
  moveName: string;
  targetId: number;
}

export type BattleEventType =
  | 'turn-start'
  | 'use-move'
  | 'damage'
  | 'faint'
  | 'text'
  | 'battle-over';

export interface BattleEventPayload {
  attackerId?: number;
  moveName?: string;
  targetId?: number;
  damage?: number;
  hpBefore?: number;
  hpAfter?: number;
  pokemonId?: number;
  winner?: 'player' | 'opponent';
}

export interface BattleEvent {
  type: BattleEventType;
  message: string;
  payload?: BattleEventPayload;
}
