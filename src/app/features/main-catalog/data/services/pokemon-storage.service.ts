import { inject, Service } from '@angular/core';
import { PokemonPaginationService } from './pokemon-pagination.service';

@Service({ autoProvided: false })
export class PokemonStorageService {
  public readonly pokemonPaginationService = inject(PokemonPaginationService);
}
