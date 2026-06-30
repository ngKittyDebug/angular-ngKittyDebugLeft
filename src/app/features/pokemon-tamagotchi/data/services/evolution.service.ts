import { Injectable } from '@angular/core';
import {
  EVOLUTION_ANIMATION_DURATION_MS,
  EVOLUTION_REQUIREMENTS,
} from '../constants/evolution-criteria.constants';
import {
  buildEvolutionProgressValues,
  buildEvolvedPokemon,
  checkEvolutionCriteria,
  getRequirementCompletionRatio,
} from '../helpers/evolution-checker.helper';
import type { Achievement } from '../../models/achievement.model';
import type {
  EvolutionChain,
  EvolutionCheckResult,
  EvolutionData,
  EvolutionProgress,
  EvolutionRequirement,
  EvolutionResult,
} from '../../models/evolution.model';
import type { Pokemon } from '../../models/pokemon.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';
import type { DailyRoutine } from '../../models/tamagotchi-state.model';

@Injectable({ providedIn: 'root' })
export class EvolutionService {
  public checkEvolutionCriteria(
    pokemon: Pokemon,
    status: PokemonStatus,
    achievements: Achievement[],
    dailyRoutine: DailyRoutine,
    requirements: EvolutionRequirement[] = this.getRequirementsForPokemon(pokemon),
  ): EvolutionCheckResult {
    return checkEvolutionCriteria(requirements, status, achievements, dailyRoutine.consecutiveDays);
  }

  public computeEvolutionProgress(
    status: PokemonStatus,
    achievements: Achievement[],
    dailyRoutine: DailyRoutine,
    requirements: EvolutionRequirement[] = EVOLUTION_REQUIREMENTS,
  ): EvolutionProgress {
    const result = checkEvolutionCriteria(
      requirements,
      status,
      achievements,
      dailyRoutine.consecutiveDays,
    );

    return result.progress;
  }

  public getEvolutionChain(pokemon: Pokemon): EvolutionChain {
    return pokemon.evolutionChain;
  }

  public getRequirementsForPokemon(pokemon: Pokemon): EvolutionRequirement[] {
    const chainRequirements = pokemon.evolutionChain.nextEvolution?.requirements;

    if (chainRequirements && chainRequirements.length > 0) {
      return chainRequirements;
    }

    return EVOLUTION_REQUIREMENTS;
  }

  public buildEvolutionData(pokemon: Pokemon): EvolutionData | null {
    const nextEvolution = pokemon.evolutionChain.nextEvolution;

    if (!nextEvolution) {
      return null;
    }

    return {
      animationDuration: EVOLUTION_ANIMATION_DURATION_MS,
      fromPokemonId: pokemon.id,
      requirements: this.getRequirementsForPokemon(pokemon),
      toPokemonId: nextEvolution.pokemonId,
    };
  }

  public triggerEvolution(pokemon: Pokemon, evolutionData: EvolutionData): EvolutionResult | null {
    if (evolutionData.fromPokemonId !== pokemon.id) {
      return null;
    }

    const evolvedPokemon = buildEvolvedPokemon(pokemon);

    if (!evolvedPokemon || evolvedPokemon.id !== evolutionData.toPokemonId) {
      return null;
    }

    return {
      evolutionData,
      evolvedPokemon,
    };
  }

  public getRequirementCompletionRatio(
    requirement: EvolutionRequirement,
    status: PokemonStatus,
    achievements: Achievement[],
    dailyRoutine: DailyRoutine,
  ): number {
    const currentProgress = buildEvolutionProgressValues(
      status,
      achievements,
      dailyRoutine.consecutiveDays,
    );

    return getRequirementCompletionRatio(requirement, currentProgress);
  }

  public canEvolve(
    pokemon: Pokemon,
    status: PokemonStatus,
    achievements: Achievement[],
    dailyRoutine: DailyRoutine,
  ): boolean {
    if (!pokemon.isFirstStage && !pokemon.evolutionChain.nextEvolution) {
      return false;
    }

    return this.checkEvolutionCriteria(pokemon, status, achievements, dailyRoutine).isReady;
  }
}
