import { inject, resource, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import type { EvolutionChainResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';

export interface EvolutionNodeModel {
  name: string;
  image: string;
  condition: string | null;
  children: EvolutionNodeModel[];
}

@Service()
export class PokemonProfileService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public createPokemonProfile(pokemonEndpoint: () => string) {
    const pokemonDataResource = resource({
      params: () => ({ name: pokemonEndpoint() }),
      loader: ({ params }): Promise<PokemonDetailApiData> =>
        this.pokemonApiService.getPokemonData(params.name).then((data) => data.json()),
    });
    const pokemonSpeciesResource = resource({
      params: () => ({ name: pokemonEndpoint() }),
      loader: ({ params }): Promise<PokemonSpeciesApiData> =>
        this.pokemonApiService.getPokemonSpecies(params.name).then((data) => data.json()),
    });
    const pokemonEvolutionResource = resource({
      params: () => {
        const speciesData = pokemonSpeciesResource.value();

        if (!speciesData || pokemonSpeciesResource.error() || !speciesData.evolution_chain?.url) {
          return null;
        }
        const chainId = speciesData.evolution_chain.url.split('/').filter(Boolean).pop();

        return chainId ? { id: chainId } : null;
      },

      loader: (context): Promise<EvolutionChainResponse | null> => {
        if (!context.params) {
          return Promise.resolve(null);
        }

        return this.pokemonApiService
          .getEvolutionChain(context.params.id)
          .then((data) => data.json());
      },
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
}
