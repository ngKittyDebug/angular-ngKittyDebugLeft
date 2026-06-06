import { computed, inject, Service, signal } from '@angular/core';
import { INITIAL_LIMIT_STEP } from '@core/constants/pokemon-constants';
import { PokemonPaginationStorageService } from '../data/pokemon-pagination-storage.service';

@Service()
export class PokemonPaginationService {
  private readonly pokemonPaginationStorageService = inject(PokemonPaginationStorageService);
  private readonly _pokemonPagination = this.pokemonPaginationStorageService._pokemonPagination;

  public readonly currentPage = signal<number>(0);

  public readonly countPokemonData = computed(() => this.pokemonPaginationData()?.count);

  public readonly allPokemonPagesCount = computed(() => {
    const count = this.countPokemonData() || 0;

    return Math.floor(count / INITIAL_LIMIT_STEP);
  });

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;

  public readonly currentPokemonDataAfterPagination = computed(() => {
    return this.pokemonPaginationData()?.results.slice(
      this.currentPage() * INITIAL_LIMIT_STEP,
      this.currentPage() * INITIAL_LIMIT_STEP + INITIAL_LIMIT_STEP,
    );
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
