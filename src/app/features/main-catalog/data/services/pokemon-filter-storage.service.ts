import { computed, inject, resource, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';

interface PokeApiListResponse {
  results: { name: string }[];
}
@Service({ autoProvided: false })
export class PokemonFilterStorageService {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly typeListResource = resource({
    loader: (): Promise<string[]> =>
      this.pokemonApiService
        .getTypeList()
        .then((r) => r.json() as Promise<PokeApiListResponse>)
        .then((data) => data.results.map((t) => t.name)),
  });

  public readonly generationListResource = resource({
    loader: (): Promise<string[]> =>
      this.pokemonApiService
        .getGenerationList()
        .then((r) => r.json() as Promise<PokeApiListResponse>)
        .then((data) => data.results.map((g) => g.name)),
  });
  public readonly typeList = computed(() => this.typeListResource.value());
  public readonly generationList = computed(() => this.generationListResource.value());
}
