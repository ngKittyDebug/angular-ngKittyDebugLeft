export interface EvolutionRequirement {
  type: 'experience' | 'level' | 'achievement' | 'care' | 'time';
  value: number;
  description: string;
}

export interface EvolutionChain {
  currentStage: number;
  totalStages: number;
  nextEvolution?: {
    pokemonId: string;
    requirements: EvolutionRequirement[];
  };
}

export interface EvolutionProgress {
  requirements: EvolutionRequirement[];
  currentProgress: Record<string, number>;
  isReady: boolean;
}

export interface EvolutionData {
  fromPokemonId: string;
  toPokemonId: string;
  animationDuration: number;
  requirements: EvolutionRequirement[];
}

export interface EvolutionCheckResult {
  isReady: boolean;
  progress: EvolutionProgress;
  missingRequirements: EvolutionRequirement[];
}
