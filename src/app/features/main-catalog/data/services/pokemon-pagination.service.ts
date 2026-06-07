import { computed, debounced, inject, Service, signal } from '@angular/core';
import { PokemonPaginationStorageService } from './pokemon-pagination-storage.service';
import { INITIAL_LIMIT_STEP } from '../constants/main-catalog-constants';

@Service({ autoProvided: false })
export class PokemonPaginationService {
  private readonly pokemonPaginationStorageService = inject(PokemonPaginationStorageService);
  private readonly _pokemonPagination = this.pokemonPaginationStorageService._pokemonPagination;

  public readonly filterByName = signal<string>('');

  public readonly debounceFilter = debounced(this.filterByName, 500);

  public readonly currentPage = signal<number>(0);

  public readonly countPokemonData = computed(() => this.filteredPokemonList()?.length);

  public readonly pagesCount = computed(() =>
    Math.ceil((this.countPokemonData() || 0) / INITIAL_LIMIT_STEP),
  );

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;

  public readonly filteredPokemonList = computed(() =>
    this.pokemonPaginationData()?.results.filter((pokemon) =>
      pokemon.name.includes(this.debounceFilter.value()),
    ),
  );

  public readonly paginatedPokemonList = computed(() =>
    this.filteredPokemonList()?.slice(
      this.currentPage() * INITIAL_LIMIT_STEP,
      this.currentPage() * INITIAL_LIMIT_STEP + INITIAL_LIMIT_STEP,
    ),
  );

  public setPaginationCount(count: number) {
    this.currentPage.set(count);
  }
}
