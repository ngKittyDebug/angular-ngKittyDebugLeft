import type { EvolutionChainModel } from './evolution.model';

export type SpriteVariation = 'default' | 'retro' | 'shiny';

export interface PokemonSpriteUrlsModel {
  normal: string;
  sleeping: string;
  happy: string;
  sad: string;
  eating: string;
  evolving: string;
}

export interface PokemonModel {
  id: string;
  name: string;
  species: string;
  isFirstStage: boolean;
  evolutionChain: EvolutionChainModel;
  spriteUrls: PokemonSpriteUrlsModel;
  spriteVariations: Record<SpriteVariation, PokemonSpriteUrlsModel>;
}
