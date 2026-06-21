import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';
import { forkJoin, map, of } from 'rxjs';
import { filterCommonPokemons, intersectNonEmpty } from '../helpers/filter-pokemons';
import type { PokemonGeneration, PokemonTypes } from '../models/pokemons-api-reference';

@Service({ autoProvided: false })
export class PokemonFilterStorageService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly filterByName = signal<string>('');
  public readonly filterByTypes = signal<string[]>([]);
  public readonly filterByGenerations = signal<string>('');

  public readonly typeListResource = rxResource({
    stream: () =>
      this.pokemonApiService
        .getTypeList<PokemonListApiData>()
        .pipe(map((data) => data.results.map((t) => t.name))),
  });

  public readonly generationListResource = rxResource({
    stream: () =>
      this.pokemonApiService
        .getGenerationList<PokemonListApiData>()
        .pipe(map((data) => data.results.map((t) => t.name))),
  });

  public readonly typeList = computed(() => this.typeListResource.value());
  public readonly generationList = computed(() => this.generationListResource.value());

  public readonly foundByType = rxResource({
    params: () => this.filterByTypes(),
    stream: ({ params }) => {
      if (params.length === 0) {
        return of([]);
      }

      const requests = params.map((type) =>
        this.pokemonApiService
          .getTypeList<PokemonTypes>(type)
          .pipe(map((data) => data.pokemon.map((data) => data.pokemon))),
      );

      return forkJoin(requests).pipe(
        map((arrayOfArraysOfPokemon) => filterCommonPokemons(arrayOfArraysOfPokemon)),
      );
    },
    defaultValue: [],
  });

  public readonly foundByGeneration = rxResource({
    params: () => this.filterByGenerations(),
    stream: ({ params }) => {
      if (!this.filterByGenerations()) {
        return of([]);
      }

      return this.pokemonApiService
        .getGenerationList<PokemonGeneration>(params)
        .pipe(map((data) => data.pokemon_species));
    },
    defaultValue: [],
  });

  public readonly unionResult = computed(() =>
    intersectNonEmpty(this.foundByType.value(), this.foundByGeneration.value()),
  );
}
