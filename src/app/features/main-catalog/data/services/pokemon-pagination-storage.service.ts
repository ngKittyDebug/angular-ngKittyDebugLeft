import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service({ autoProvided: false })
export class PokemonPaginationStorageService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly _pokemonPagination = httpResource<PokemonListApiData>(() =>
    this.pokemonApiService.getPokemonPaginationUrl(),
  );
}
