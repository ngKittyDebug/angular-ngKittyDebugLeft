import { inject, Service } from '@angular/core';

import { PokemonPaginationService } from './pokemon-pagination.service';

@Service()
export class PokemonStorageService {
  public readonly pokemonPaginationService = inject(PokemonPaginationService);
}
