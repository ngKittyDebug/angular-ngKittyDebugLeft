import { Service } from '@angular/core';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';

const ALL_POKEMON_LIMIT = 10000;

@Service()
export class PokemonApiService {
  public async getPokemonPaginationData(
    options = { limitPokemon: ALL_POKEMON_LIMIT },
  ): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}pokemon?limit=${options.limitPokemon}`);
  }
  public async getTypeList(): Promise<Response> {
    return fetch(`${POKEMON_BASE_API}type`);
  }

  public async getGenerationList(): Promise<Response> {
    return fetch(`${POKEMON_BASE_API}generation`);
  }
}
