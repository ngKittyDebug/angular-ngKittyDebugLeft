import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonListApiData } from '@shared/models/pokemon-list-api-data-interface';

@Service()
export class PokemonBattleApiService {
  private readonly http = inject(HttpClient);

  public getPokemonList(
    limit: number,
    offset: number,
  ): Observable<{ results: PokemonDetailApiData[]; total: number }> {
    const listUrl = `${POKEMON_BASE_API}pokemon?limit=${limit}&offset=${offset}`;

    return this.http.get<PokemonListApiData>(listUrl).pipe(
      switchMap((listData) => {
        const total = listData.count;

        if (!listData.results || listData.results.length === 0) {
          return of({ results: [], total });
        }

        // Fetch details for all pokemons on the page
        const detailRequests = listData.results.map((reference) =>
          this.http.get<PokemonDetailApiData>(reference.url),
        );

        return forkJoin(detailRequests).pipe(map((details) => ({ results: details, total })));
      }),
    );
  }
}
