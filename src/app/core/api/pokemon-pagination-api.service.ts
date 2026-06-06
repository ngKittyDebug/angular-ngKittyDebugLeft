import { Service } from '@angular/core';
import { ALL_POKEMON_LIMIT, POKEMON_BASE_API } from '@core/constants/pokemon-constants';

@Service()
export class PokemonApiService {
  public async getPokemonPaginationData(): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}pokemon?limit=${ALL_POKEMON_LIMIT}`);
  }
}
