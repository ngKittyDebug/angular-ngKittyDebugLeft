import { inject, Service, signal } from '@angular/core';
import { PokemonPaginationStorageService } from './pokemon-pagination-storage.service';

@Service({ autoProvided: false })
export class PokemonPaginationService {
  private readonly pokemonPaginationStorageService = inject(PokemonPaginationStorageService);
  private readonly _pokemonPagination = this.pokemonPaginationStorageService._pokemonPagination;

  public readonly currentPage = signal<number>(0);

  public readonly isLoadingPokemonPaginationData = this._pokemonPagination.asReadonly().isLoading;

  public readonly pokemonPaginationData = this._pokemonPagination.asReadonly().value;

  public setPaginationCount(count: number) {
    this.currentPage.set(count);
  }
}
