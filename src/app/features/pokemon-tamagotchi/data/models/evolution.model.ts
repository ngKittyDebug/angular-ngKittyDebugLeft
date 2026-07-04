import type { PokemonModel } from './pokemon.model';

export interface EvolutionRequirementModel {
  type: 'experience' | 'level' | 'achievement' | 'care' | 'time';
  value: number;
  description: string;
}

export interface EvolutionStepModel {
  pokemonId: string;
  requirements: EvolutionRequirementModel[];
  childNextEvolution?: EvolutionStepModel;
}

export interface EvolutionChainModel {
  currentStage: number;
  totalStages: number;
  nextEvolution?: EvolutionStepModel;
}

export interface EvolutionProgressModel {
  requirements: EvolutionRequirementModel[];
  currentProgress: Record<string, number>;
  isReady: boolean;
}

export interface EvolutionDataModel {
  fromPokemonId: string;
  toPokemonId: string;
  animationDuration: number;
  requirements: EvolutionRequirementModel[];
}

export interface EvolutionCheckResultModel {
  isReady: boolean;
  progress: EvolutionProgressModel;
  missingRequirements: EvolutionRequirementModel[];
}

export interface EvolutionResultModel {
  evolvedPokemon: PokemonModel;
  evolutionData: EvolutionDataModel;
}
