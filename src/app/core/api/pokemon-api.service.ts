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

  public async getPokemonData(pokemonEndpoint: string): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}/pokemon/${pokemonEndpoint}`);
  }

  public async getPokemonSpecies(pokemonEndpoint: string): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}/pokemon-species/${pokemonEndpoint}`);
  }

  public async getEvolutionChain(pokemonEndpoint: string | null): Promise<Response> {
    return await fetch(`${POKEMON_BASE_API}evolution-chain/${pokemonEndpoint}`);
  }
}
