import type { Achievement } from '../../models/achievement.model';
import type {
  EvolutionCheckResult,
  EvolutionProgress,
  EvolutionRequirement,
} from '../../models/evolution.model';
import type { Pokemon } from '../../models/pokemon.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';

export function computeCareScore(status: PokemonStatus): number {
  return Math.round((status.health + status.hunger + status.mood + status.hydration) / 4);
}

export function computeTrainingScore(achievements: Achievement[]): number {
  return achievements
    .filter((achievement) => achievement.category === 'training' && achievement.unlocked)
    .reduce((total, achievement) => total + achievement.reward.experience, 0);
}

export function buildEvolutionProgressValues(
  status: PokemonStatus,
  achievements: Achievement[],
  consecutiveDays: number,
): Record<string, number> {
  return {
    achievement: computeTrainingScore(achievements),
    care: computeCareScore(status),
    experience: status.experience,
    level: status.level,
    time: consecutiveDays,
  };
}

export function evaluateEvolutionRequirements(
  requirements: EvolutionRequirement[],
  currentProgress: Record<string, number>,
): { isReady: boolean; missingRequirements: EvolutionRequirement[] } {
  const missingRequirements = requirements.filter(
    (requirement) => (currentProgress[requirement.type] ?? 0) < requirement.value,
  );

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}

export function checkEvolutionCriteria(
  requirements: EvolutionRequirement[],
  status: PokemonStatus,
  achievements: Achievement[],
  consecutiveDays: number,
): EvolutionCheckResult {
  const currentProgress = buildEvolutionProgressValues(status, achievements, consecutiveDays);
  const { isReady, missingRequirements } = evaluateEvolutionRequirements(
    requirements,
    currentProgress,
  );

  const progress: EvolutionProgress = {
    currentProgress,
    isReady,
    requirements,
  };

  return {
    isReady,
    missingRequirements,
    progress,
  };
}

export function getRequirementCompletionRatio(
  requirement: EvolutionRequirement,
  currentProgress: Record<string, number>,
): number {
  if (requirement.value <= 0) {
    return 1;
  }

  const current = currentProgress[requirement.type] ?? 0;

  return Math.min(1, current / requirement.value);
}

export function buildEvolvedPokemon(pokemon: Pokemon): Pokemon | null {
  const nextEvolution = pokemon.evolutionChain.nextEvolution;

  if (!nextEvolution) {
    return null;
  }

  const nextStage = pokemon.evolutionChain.currentStage + 1;

  return {
    ...pokemon,
    evolutionChain: {
      currentStage: nextStage,
      totalStages: pokemon.evolutionChain.totalStages,
    },
    id: nextEvolution.pokemonId,
    isFirstStage: false,
  };
}
