import { computed, debounced, inject, Service, signal } from '@angular/core';
import { INITIAL_LIMIT_STEP } from '@core/constants/pokemon-constants';
import { PokemonPaginationStorageService } from '../data/pokemon-pagination-storage.service';

@Service()
export class PokemonPaginationService {
  private readonly pokemonPaginationStorageService = inject(PokemonPaginationStorageService);
  private readonly _pokemonPagination = this.pokemonPaginationStorageService._pokemonPagination;

  public readonly filterByName = signal<string>('');

  public readonly debounceFilter = debounced(this.filterByName, 500);

  public readonly currentPage = signal<number>(0);

  public readonly countPokemonData = computed(() => this.filteredPokemonData()?.length);

  public readonly pagesCount = computed(() =>
    Math.ceil((this.countPokemonData() || 0) / INITIAL_LIMIT_STEP),
  );

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;

  public readonly filteredPokemonData = computed(() =>
    this.pokemonPaginationData()?.results.filter((pokemon) =>
      pokemon.name.includes(this.debounceFilter.value()),
    ),
  );

  public readonly currentPokemonDataAfterPagination = computed(() =>
    this.filteredPokemonData()?.slice(
      this.currentPage() * INITIAL_LIMIT_STEP,
      this.currentPage() * INITIAL_LIMIT_STEP + INITIAL_LIMIT_STEP,
    ),
  );

  public setPaginationCount(count: number) {
    this.currentPage.set(count);
  }
}
