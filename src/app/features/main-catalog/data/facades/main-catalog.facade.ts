import { inject, Service } from '@angular/core';
import { PokemonPaginationService } from '@features/main-catalog/data/services/pokemon-pagination.service';

@Service({ autoProvided: false })
export class MainCatalogFacade {
  private readonly pokemonPaginationService = inject(PokemonPaginationService);

  public readonly currentPage = this.pokemonPaginationService.currentPage;
  public readonly pagesCount = this.pokemonPaginationService.pagesCount;

  public readonly isLoadingPokemonPaginationData =
    this.pokemonPaginationService.isLoadingPokemonPaginationData;

  public readonly paginatedPokemonList = this.pokemonPaginationService.paginatedPokemonList;

  public readonly filterByName = this.pokemonPaginationService.filterByName;

  public readonly setPaginationCount = (count: number): void =>
    this.pokemonPaginationService.setPaginationCount(count);
}
