import { computed, inject, Service } from '@angular/core';
import { PokemonPaginationService } from '@features/main-catalog/data/services/pokemon-pagination.service';
import { PokemonFilterStorageService } from '../services/pokemon-filter-storage.service';
import { INITIAL_LIMIT_STEP } from '../constants/main-catalog-constants';

@Service({ autoProvided: false })
export class MainCatalogFacade {
  private readonly pokemonPaginationService = inject(PokemonPaginationService);
  private readonly pokemonFilterStorageService = inject(PokemonFilterStorageService);

  public readonly currentPage = this.pokemonPaginationService.currentPage;

  public readonly isLoadingPokemonPaginationData =
    this.pokemonPaginationService.isLoadingPokemonPaginationData;

  public readonly filterByName = this.pokemonFilterStorageService.filterByName;
  public readonly filterByTypes = this.pokemonFilterStorageService.filterByTypes;
  public readonly filterByGenerations = this.pokemonFilterStorageService.filterByGenerations;
  public readonly typeList = this.pokemonFilterStorageService.typeList;
  public readonly generationList = this.pokemonFilterStorageService.generationList;

  public readonly pokemonPaginationData = this.pokemonPaginationService.pokemonPaginationData;

  public readonly filteredPokemonList = computed(() => {
    const unionResult = this.pokemonFilterStorageService.unionResult;

    if (this.filterByTypes().length || this.filterByGenerations().length) {
      const namesSet = new Set(unionResult().map((n) => n.toLowerCase()));

      return this.pokemonPaginationData()
        ?.results.filter((p) => namesSet.has(p.name.toLowerCase()))
        .filter((pokemon) => pokemon.name.includes(this.filterByName().toLowerCase()));
    }

    return this.pokemonPaginationData()?.results.filter((pokemon) =>
      pokemon.name.includes(this.filterByName().toLowerCase()),
    );
  });

  public readonly paginatedPokemonList = computed(() =>
    this.filteredPokemonList()?.slice(
      this.currentPage() * INITIAL_LIMIT_STEP,
      this.currentPage() * INITIAL_LIMIT_STEP + INITIAL_LIMIT_STEP,
    ),
  );

  public readonly pagesCount = computed(() =>
    Math.ceil((this.countPokemonData() || 0) / INITIAL_LIMIT_STEP),
  );

  public readonly countPokemonData = computed(() => this.filteredPokemonList()?.length);

  public readonly setPaginationCount = (count: number): void =>
    this.pokemonPaginationService.setPaginationCount(count);
}
