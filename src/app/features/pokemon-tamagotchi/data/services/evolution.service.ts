import { inject, Service } from '@angular/core';
import { catchError, map, type Observable, of } from 'rxjs';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import { EVOLUTION_ANIMATION_DURATION_MS } from '../constants/evolution-criteria.constants';
import { getEvolutionRequirementsForPokemon } from '../helpers/evolution-checker.helper';
import type {
  EvolutionDataModel,
  EvolutionRequirementModel,
  EvolutionResultModel,
} from '../models/evolution.model';
import type { PokemonModel } from '../models/pokemon.model';

@Service({ autoProvided: false })
export class EvolutionService {
  private readonly api = inject(PokemonTamagotchiApiService);

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

  private matchesEvolutionTarget(evolvedPokemon: PokemonModel, toPokemonId: string): boolean {
    const target = toPokemonId.toLowerCase();

    return (
      evolvedPokemon.species.toLowerCase() === target ||
      evolvedPokemon.name.toLowerCase() === target ||
      evolvedPokemon.id === toPokemonId
    );
  }
}
