import { inject, Service } from '@angular/core';
import { catchError, map, type Observable, of } from 'rxjs';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import {
  EVOLUTION_ANIMATION_DURATION_MS,
  EVOLUTION_REQUIREMENTS,
} from '../constants/evolution-criteria.constants';
import {
  buildEvolutionProgressValues,
  checkEvolutionCriteria,
  getEvolutionRequirementsForPokemon,
  getRequirementCompletionRatio,
} from '../helpers/evolution-checker.helper';
import type { AchievementModel } from '../models/achievement.model';
import type {
  EvolutionChainModel,
  EvolutionCheckResultModel,
  EvolutionDataModel,
  EvolutionProgressModel,
  EvolutionRequirementModel,
  EvolutionResultModel,
} from '../models/evolution.model';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import type { DailyRoutine } from '../models/tamagotchi-state.model';

@Service({ autoProvided: false })
export class EvolutionService {
  private readonly api = inject(PokemonTamagotchiApiService);

  public checkEvolutionCriteria(
    pokemon: PokemonModel,
    status: PokemonStatusModel,
    achievementList: AchievementModel[],
    dailyRoutine: DailyRoutine,
    requirements: EvolutionRequirementModel[] = this.getRequirementsForPokemon(pokemon),
  ): EvolutionCheckResultModel {
    return checkEvolutionCriteria(
      requirements,
      status,
      achievementList,
      dailyRoutine.consecutiveDays,
    );
  }

  public computeEvolutionProgress(
    status: PokemonStatusModel,
    achievementList: AchievementModel[],
    dailyRoutine: DailyRoutine,
    requirements: EvolutionRequirementModel[] = EVOLUTION_REQUIREMENTS,
  ): EvolutionProgressModel {
    const result = checkEvolutionCriteria(
      requirements,
      status,
      achievementList,
      dailyRoutine.consecutiveDays,
    );

    return result.progress;
  }

  public getEvolutionChain(pokemon: PokemonModel): EvolutionChainModel {
    return pokemon.evolutionChain;
  }

  public getRequirementsForPokemon(pokemon: PokemonModel): EvolutionRequirementModel[] {
    return getEvolutionRequirementsForPokemon(pokemon);
  }

  public buildEvolutionData(pokemon: PokemonModel): EvolutionDataModel | null {
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

  public prepareEvolution(pokemon: PokemonModel): Observable<EvolutionResultModel | null> {
    const evolutionData = this.buildEvolutionData(pokemon);

    if (!evolutionData) {
      return of(null);
    }

    return this.api.loadPokemonByName(evolutionData.toPokemonId).pipe(
      map((evolvedPokemon) => {
        if (!this.matchesEvolutionTarget(evolvedPokemon, evolutionData.toPokemonId)) {
          return null;
        }

        return {
          evolutionData,
          evolvedPokemon,
        };
      }),
      catchError(() => of(null)),
    );
  }

  public getRequirementCompletionRatio(
    requirement: EvolutionRequirementModel,
    status: PokemonStatusModel,
    achievementList: AchievementModel[],
    dailyRoutine: DailyRoutine,
  ): number {
    const currentProgress = buildEvolutionProgressValues(
      status,
      achievementList,
      dailyRoutine.consecutiveDays,
    );

    return getRequirementCompletionRatio(requirement, currentProgress);
  }

  public canEvolve(
    pokemon: PokemonModel,
    status: PokemonStatusModel,
    achievementList: AchievementModel[],
    dailyRoutine: DailyRoutine,
  ): boolean {
    if (!pokemon.isFirstStage && !pokemon.evolutionChain.nextEvolution) {
      return false;
    }

    return this.checkEvolutionCriteria(pokemon, status, achievementList, dailyRoutine).isReady;
  }

  private matchesEvolutionTarget(evolvedPokemon: PokemonModel, toPokemonId: string): boolean {
    const target = toPokemonId.toLowerCase();

    return (
      evolvedPokemon.species.toLowerCase() === target ||
      evolvedPokemon.name.toLowerCase() === target ||
      evolvedPokemon.id === toPokemonId
    );
  }
}
