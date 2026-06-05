import { Service } from '@angular/core';
import { INITIAL_LIMIT, POKEMON_BASE_API } from '@core/constants/pokemon-constants';

@Service()
export class PokemonPaginationApiService {
  public async getPokemonPaginationData(offset = 0): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}pokemon?limit=${INITIAL_LIMIT}&offset=${offset}`);
  }
}
