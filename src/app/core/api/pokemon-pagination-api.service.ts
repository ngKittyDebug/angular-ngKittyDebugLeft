import { Service } from '@angular/core';

const POKEMON_BASE_API = 'https://pokeapi.co/api/v2/';

@Service()
export class PokemonPaginationApiService {
  public async getPokemonPaginationData(): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}pokemon?limit=5&offset=0`);
  }
}
