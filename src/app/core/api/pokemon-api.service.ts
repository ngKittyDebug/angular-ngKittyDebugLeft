import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';

const ALL_POKEMON_LIMIT = 10000;

@Service()
export class PokemonApiService {
  private readonly http = inject(HttpClient);

  public getPokemonPaginationUrl(options = { limitPokemon: ALL_POKEMON_LIMIT }): string {
    return `${POKEMON_BASE_API}pokemon?limit=${options.limitPokemon}`;
  }

  public getPokemonData(pokemonEndpoint: string): string {
    return `${POKEMON_BASE_API}pokemon/${pokemonEndpoint}`;
  }

  public getPokemonSpecies(pokemonEndpoint: string): string {
    return `${POKEMON_BASE_API}pokemon-species/${pokemonEndpoint}`;
  }

  public getEvolutionChain(pokemonEndpoint: string): string {
    return `${POKEMON_BASE_API}evolution-chain/${pokemonEndpoint}`;
  }
  public getTypeList<T>(type = '') {
    return this.http.get<T>(`${POKEMON_BASE_API}type/${type}`);
  }

  public getGenerationList<T>(generation = '') {
    return this.http.get<T>(`${POKEMON_BASE_API}generation/${generation}`);
  }
}
