import { computed, inject, resource, Service, signal } from '@angular/core';
import { PokemonPaginationApiService } from '@core/api/pokemon-pagination-api.service';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service()
export class PokemonStorageService {
  private readonly pokemonPaginationApiService = inject(PokemonPaginationApiService);

  private readonly _pokemonPagination = resource({
    params: () => ({ number: this.paginationOffsetStep() }),
    loader: ({ params }): Promise<PokemonListApiData> =>
      this.pokemonPaginationApiService
        .getPokemonPaginationData(params.number)
        .then((data) => data.json()),
  });

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;

  public readonly countPokemonData = computed(() => this.pokemonPaginationData()?.count);

  public readonly paginationOffsetStep = signal<number>(0);

  // Предполагаю, данный данные нам будут не нужны, я вытащил их заранее, может будут нужны
  public readonly previousPokemonPaginationLink = computed(
    () => this.pokemonPaginationData()?.previous,
  );

  public readonly nextPokemonPaginationLink = computed(() => this.pokemonPaginationData()?.next);
}
