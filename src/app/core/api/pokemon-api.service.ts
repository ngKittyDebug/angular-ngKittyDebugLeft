import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type {
  PokemonGenerationApiData,
  PokemonTypeApiData,
} from '@features/main-catalog/data/models/pokemons-api-reference';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';
import type { Observable } from 'rxjs';

const ALL_POKEMON_LIMIT = 10000;

@Service()
export class PokemonApiService {
  private readonly http = inject(HttpClient);

  public getPokemonPaginationUrl(options = { limitPokemon: ALL_POKEMON_LIMIT }): string {
    return `${POKEMON_BASE_API}pokemon?limit=${options.limitPokemon}`;
  }

  public getPokemonPageUrl(limit: number, offset: number): string {
    return `${POKEMON_BASE_API}pokemon?limit=${limit}&offset=${offset}`;
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

  public getTypeList(): Observable<PokemonListApiData> {
    return this.http.get<PokemonListApiData>(`${POKEMON_BASE_API}type`);
  }

  public getGenerationList(): Observable<PokemonListApiData> {
    return this.http.get<PokemonListApiData>(`${POKEMON_BASE_API}generation`);
  }

  public getType(type = '') {
    return this.http.get<PokemonTypeApiData>(`${POKEMON_BASE_API}type/${type}`);
  }

  public getGeneration(generation = '') {
    return this.http.get<PokemonGenerationApiData>(`${POKEMON_BASE_API}generation/${generation}`);
  }
}
