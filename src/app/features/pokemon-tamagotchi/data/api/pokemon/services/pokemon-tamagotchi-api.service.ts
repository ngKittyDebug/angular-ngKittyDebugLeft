import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import type { Observable } from 'rxjs';
import { catchError, map, of, switchMap } from 'rxjs';
import type { PokemonModel } from '../../../models/pokemon.model';
import { convertPokemonDetailApiDataToTamagotchiPokemon } from '../helpers/pokemon-tamagotchi-converter';

@Injectable({ providedIn: 'root' })
export class PokemonTamagotchiApiService {
  private readonly http = inject(HttpClient);
  private readonly pokemonApi = inject(PokemonApiService);

  public loadPokemonByName(nameOrId: string): Observable<PokemonModel> {
    return this.http.get<PokemonDetailApiData>(this.pokemonApi.getPokemonData(nameOrId)).pipe(
      switchMap((detail) =>
        this.http
          .get<PokemonSpeciesApiData>(this.pokemonApi.getPokemonSpecies(detail.species.name))
          .pipe(
            switchMap((species) => {
              const chainId = species.evolution_chain?.url.split('/').filter(Boolean).pop();

              if (!chainId) {
                return of(
                  convertPokemonDetailApiDataToTamagotchiPokemon(
                    detail,
                    this.fallbackEvolutionChain(detail),
                  ),
                );
              }

              return this.http
                .get<EvolutionChainApiResponse>(this.pokemonApi.getEvolutionChain(chainId))
                .pipe(
                  map((chain) => convertPokemonDetailApiDataToTamagotchiPokemon(detail, chain)),
                  catchError(() =>
                    of(
                      convertPokemonDetailApiDataToTamagotchiPokemon(
                        detail,
                        this.fallbackEvolutionChain(detail),
                      ),
                    ),
                  ),
                );
            }),
            catchError(() =>
              of(
                convertPokemonDetailApiDataToTamagotchiPokemon(
                  detail,
                  this.fallbackEvolutionChain(detail),
                ),
              ),
            ),
          ),
      ),
    );
  }

  private fallbackEvolutionChain(detail: PokemonDetailApiData): EvolutionChainApiResponse {
    return {
      baby_trigger_item: null,
      chain: {
        evolution_details: [],
        evolves_to: [],
        is_baby: false,
        species: detail.species,
      },
      id: detail.id,
    };
  }
}
