import { computed, inject, resource, Service, signal } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service({ autoProvided: false })
export class PokemonFilterStorageService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly filterByName = signal<string>('');
  public readonly filterByTypes = signal<string[]>([]);
  public readonly filterByGenerations = signal<string[]>([]);

  public readonly typeListResource = resource({
    loader: (): Promise<string[]> =>
      this.pokemonApiService
        .getTypeList()
        .then((r) => r.json() as Promise<PokemonListApiData>)
        .then((data) => data.results.map((t) => t.name)),
  });

  public readonly generationListResource = resource({
    loader: (): Promise<string[]> =>
      this.pokemonApiService
        .getGenerationList()
        .then((r) => r.json() as Promise<PokemonListApiData>)
        .then((data) => data.results.map((g) => g.name)),
  });
  public readonly typeList = computed(() => this.typeListResource.value());
  public readonly generationList = computed(() => this.generationListResource.value());
}
