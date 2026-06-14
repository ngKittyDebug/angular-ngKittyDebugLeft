import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import type { EvolutionChainResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';

export interface EvolutionNodeModel {
  name: string;
  condition: string | null;
  children: EvolutionNodeModel[];
}

@Service()
export class PokemonDataService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public createPokemonProfileData(pokemonEndpoint: () => string) {
    const pokemonDataResource = httpResource<PokemonDetailApiData>(() =>
      this.pokemonApiService.getPokemonData(pokemonEndpoint()),
    );
    const pokemonSpeciesResource = httpResource<PokemonSpeciesApiData>(() =>
      this.pokemonApiService.getPokemonSpecies(pokemonEndpoint()),
    );
    const pokemonEvolutionResource = httpResource<EvolutionChainResponse>(() => {
      const speciesData = pokemonSpeciesResource.value();

      if (!speciesData || pokemonSpeciesResource.error() || !speciesData.evolution_chain?.url) {
        return undefined;
      }

      const chainId = speciesData.evolution_chain.url.split('/').filter(Boolean).pop();

      return chainId ? this.pokemonApiService.getEvolutionChain(chainId) : undefined;
    });

    const result = {
      profileData: pokemonDataResource.value,
      profileSpecies: pokemonSpeciesResource.value,
      profileEvolution: pokemonEvolutionResource.value,
      profileDataError: pokemonDataResource.error,
      profileSpeciesError: pokemonSpeciesResource.error,
      profileEvolutionError: pokemonEvolutionResource.error,
    };

    return result;
  }

  public createPokemonCardData(pokemonEndpoint: () => string) {
    const pokemonDataResource = httpResource<PokemonDetailApiData>(() =>
      this.pokemonApiService.getPokemonData(pokemonEndpoint()),
    );

    const result = {
      cardData: pokemonDataResource.value,
      cardDataError: pokemonDataResource.error,
    };

    return result;
  }
}
