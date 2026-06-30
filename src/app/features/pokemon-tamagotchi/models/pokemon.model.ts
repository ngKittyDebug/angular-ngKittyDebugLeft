import type { EvolutionChain } from './evolution.model';

export interface PokemonSpriteUrls {
  normal: string;
  sleeping: string;
  happy: string;
  sad: string;
  eating: string;
  evolving: string;
}

export interface PokemonBaseStats {
  hungerDecayRate: number;
  moodDecayRate: number;
  energyRestorationRate: number;
  experienceMultiplier: number;
}

export interface Pokemon {
  id: string;
  name: string;
  species: string;
  isFirstStage: boolean;
  evolutionChain: EvolutionChain;
  spriteUrls: PokemonSpriteUrls;
  baseStats: PokemonBaseStats;
}
