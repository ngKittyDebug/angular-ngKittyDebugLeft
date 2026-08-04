import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import type { AchievementModel } from '../models/achievement.model';
import type { EvolutionProgressModel, EvolutionRequirementModel } from '../models/evolution.model';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';

function computeCareScore(status: PokemonStatusModel): number {
  return Math.round((status.health + status.hunger + status.mood + status.hydration) / 4);
}

function computeTrainingScore(achievementList: AchievementModel[]): number {
  return achievementList
    .filter((achievement) => achievement.category === 'training' && achievement.unlocked)
    .reduce((total, achievement) => total + achievement.reward.experience, 0);
}

export function buildEvolutionProgressValues(
  status: PokemonStatusModel,
  achievementList: AchievementModel[],
  consecutiveDays: number,
): Record<string, number> {
  return {
    achievement: computeTrainingScore(achievementList),
    care: computeCareScore(status),
    experience: status.experience,
    level: status.level,
    time: consecutiveDays,
  };
}

export function evaluateEvolutionRequirements(
  requirements: EvolutionRequirementModel[],
  currentProgress: Record<string, number>,
): { isReady: boolean; missingRequirements: EvolutionRequirementModel[] } {
  const missingRequirements = requirements.filter(
    (requirement) => (currentProgress[requirement.type] ?? 0) < requirement.value,
  );

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}

export function getEvolutionRequirementsForPokemon(
  pokemon: PokemonModel | null,
): EvolutionRequirementModel[] {
  const chainRequirements = pokemon?.evolutionChain.nextEvolution?.requirements;

  if (chainRequirements && chainRequirements.length > 0) {
    return chainRequirements;
  }

  return EVOLUTION_REQUIREMENTS;
}

export function buildEvolutionProgressForPokemon(
  pokemon: PokemonModel | null,
): EvolutionProgressModel {
  if (!pokemon?.evolutionChain.nextEvolution) {
    return { requirements: [], currentProgress: {}, isReady: false, readyNotifiedAt: null };
  }

  const requirements = getEvolutionRequirementsForPokemon(pokemon);
  const currentProgress: Record<string, number> = {};

  for (const requirement of requirements) {
    currentProgress[requirement.type] = 0;
  }

  return {
    requirements,
    currentProgress,
    isReady: false,
    readyNotifiedAt: null,
  };
}
