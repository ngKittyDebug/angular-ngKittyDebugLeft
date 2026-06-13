import { inject, Service } from '@angular/core';
import { PokemonPaginationService } from '@features/main-catalog/data/services/pokemon-pagination.service';
import { PokemonFilterStorageService } from '../services/pokemon-filter-storage.service';

@Service({ autoProvided: false })
export class MainCatalogFacade {
  private readonly pokemonPaginationService = inject(PokemonPaginationService);
  private readonly pokemonFilterStorageService = inject(PokemonFilterStorageService);

  public readonly currentPage = this.pokemonPaginationService.currentPage;
  public readonly pagesCount = this.pokemonPaginationService.pagesCount;

  public readonly isLoadingPokemonPaginationData =
    this.pokemonPaginationService.isLoadingPokemonPaginationData;

  public readonly paginatedPokemonList = this.pokemonPaginationService.paginatedPokemonList;

  public readonly filterByName = this.pokemonPaginationService.filterByName;
  public readonly filterByTypes = this.pokemonPaginationService.filterByTypes;
  public readonly filterByGenerations = this.pokemonPaginationService.filterByGenerations;
  public readonly typeList = this.pokemonFilterStorageService.typeList;
  public readonly generationList = this.pokemonFilterStorageService.generationList;

  public readonly setPaginationCount = (count: number): void =>
    this.pokemonPaginationService.setPaginationCount(count);
}
