import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

@Service()
export class PokemonCardDataService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public createPokemonDataService(pokemonEndpoint: () => string) {
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
