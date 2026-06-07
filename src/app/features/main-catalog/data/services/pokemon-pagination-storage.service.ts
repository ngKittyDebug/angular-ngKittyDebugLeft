import { inject, resource, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-pagination-api.service';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service({ autoProvided: false })
export class PokemonPaginationStorageService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly _pokemonPagination = resource({
    loader: (): Promise<PokemonListApiData> =>
      this.pokemonApiService.getPokemonPaginationData().then((data) => data.json()),
  });
}
