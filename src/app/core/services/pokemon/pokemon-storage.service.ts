import { inject, resource, Service } from '@angular/core';
import { PokemonPaginationApiService } from '@core/api/pokemon-pagination-api.service';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service()
export class PokemonStorageService {
  private readonly pokemonPaginationApiService = inject(PokemonPaginationApiService);

  private readonly _pokemonPagination = resource({
    loader: (): Promise<PokemonListApiData> =>
      this.pokemonPaginationApiService.getPokemonPaginationData().then((data) => data.json()),
  });

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;
}
