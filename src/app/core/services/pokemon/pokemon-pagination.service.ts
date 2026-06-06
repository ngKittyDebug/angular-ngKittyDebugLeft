import { computed, inject, resource, Service, signal } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-pagination-api.service';
import { INITIAL_LIMIT_STEP } from '@core/constants/pokemon-constants';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service()
export class PokemonPaginationService {
  private readonly pokemonApiService = inject(PokemonApiService);

  private readonly _pokemonPagination = resource({
    loader: (): Promise<PokemonListApiData> =>
      this.pokemonApiService.getPokemonPaginationData().then((data) => data.json()),
  });

  public readonly currentPage = signal<number>(0);

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly currentPokemonDataAfterPagination = computed(() => {
    return this.pokemonPaginationData()?.results.slice(
      this.currentPage() * INITIAL_LIMIT_STEP,
      this.currentPage() * INITIAL_LIMIT_STEP + INITIAL_LIMIT_STEP,
    );
  });

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;

  public readonly countPokemonData = computed(() => this.pokemonPaginationData()?.count);

  public readonly allPokemonPagesCount = computed(() => {
    const count = this.countPokemonData() || 0;

    return Math.floor(count / INITIAL_LIMIT_STEP);
  });

  public increasePaginationCount() {
    if (this.currentPage() < this.allPokemonPagesCount()) {
      this.currentPage.update((previous) => previous + 1);
    }
  }

  public decreasePaginationCount() {
    if (this.currentPage() <= 0) {
      return;
    }
    this.currentPage.update((previous) => previous - 1);
  }
}
