import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import type { Observable } from 'rxjs';
import { catchError, map, of, switchMap } from 'rxjs';
import { mapApiToTamagotchiPokemon } from '../helpers/pokemon-profile-mapper.helper';
import type { Pokemon } from '../../models/pokemon.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';

export const TAMAGOTCHI_SELECTED_POKEMON_KEY = 'pokemon-tamagotchi-selected-pokemon';

export interface SelectedPokemonReference {
  id: string;
  name: string;
  species: string;
}

export type PokemonSelectionError = 'evolvedPokemon' | 'loadFailed' | 'noSelection';

export interface PokemonSelectionValidation {
  error?: PokemonSelectionError;
  pokemon?: Pokemon;
  valid: boolean;
}

export interface SpriteData {
  status: 'eating' | 'evolving' | 'happy' | 'normal' | 'sad' | 'sleeping';
  url: string;
}

@Injectable({ providedIn: 'root' })
export class PokemonProfileIntegrationService {
  private readonly http = inject(HttpClient);
  private readonly pokemonApi = inject(PokemonApiService);

  public getSelectedPokemonReference(): SelectedPokemonReference | null {
    const raw = this.readStorage();

    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const reference = parsed as Partial<SelectedPokemonReference>;

      if (!reference.id || !reference.name || !reference.species) {
        return null;
      }

      return {
        id: reference.id,
        name: reference.name,
        species: reference.species,
      };
    } catch {
      return null;
    }
  }

  public saveSelectedPokemon(pokemon: Pokemon): void {
    const reference: SelectedPokemonReference = {
      id: pokemon.id,
      name: pokemon.name,
      species: pokemon.species,
    };

    this.writeStorage(JSON.stringify(reference));
  }

  public clearSelectedPokemon(): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return;
    }

    globalThis.localStorage.removeItem(TAMAGOTCHI_SELECTED_POKEMON_KEY);
  }

  public getSelectedPokemon(): Observable<Pokemon | null> {
    const reference = this.getSelectedPokemonReference();

    if (!reference) {
      return of(null);
    }

    return this.loadPokemonByName(reference.name).pipe(catchError(() => of(null)));
  }

  public loadPokemonByName(nameOrId: string): Observable<Pokemon> {
    return this.http.get<PokemonDetailApiData>(this.pokemonApi.getPokemonData(nameOrId)).pipe(
      switchMap((detail) =>
        this.http.get<PokemonSpeciesApiData>(this.pokemonApi.getPokemonSpecies(detail.name)).pipe(
          switchMap((species) => {
            const chainId = species.evolution_chain?.url.split('/').filter(Boolean).pop();

            if (!chainId) {
              return of(mapApiToTamagotchiPokemon(detail, this.fallbackEvolutionChain(detail)));
            }

            return this.http
              .get<EvolutionChainApiResponse>(this.pokemonApi.getEvolutionChain(chainId))
              .pipe(
                map((chain) => mapApiToTamagotchiPokemon(detail, chain)),
                catchError(() =>
                  of(mapApiToTamagotchiPokemon(detail, this.fallbackEvolutionChain(detail))),
                ),
              );
          }),
        ),
      ),
    );
  }

  public isFirstStagePokemon(pokemon: Pokemon): boolean {
    return pokemon.isFirstStage;
  }

  public validatePokemonSelection(pokemon: Pokemon): PokemonSelectionValidation {
    if (!this.isFirstStagePokemon(pokemon)) {
      return {
        error: 'evolvedPokemon',
        valid: false,
      };
    }

    return {
      pokemon,
      valid: true,
    };
  }

  public validateSelectedPokemon(): Observable<PokemonSelectionValidation> {
    const reference = this.getSelectedPokemonReference();

    if (!reference) {
      return of({ error: 'noSelection', valid: false });
    }

    return this.loadPokemonByName(reference.name).pipe(
      map((pokemon) => this.validatePokemonSelection(pokemon)),
      catchError(() => of<PokemonSelectionValidation>({ error: 'loadFailed', valid: false })),
    );
  }

  public getPokemonSprite(pokemon: Pokemon, status: PokemonStatus): Observable<SpriteData> {
    const spriteStatus = this.resolveSpriteStatus(status);

    return of({
      status: spriteStatus,
      url: pokemon.spriteUrls[spriteStatus],
    });
  }

  private resolveSpriteStatus(
    status: PokemonStatus,
  ): 'eating' | 'evolving' | 'happy' | 'normal' | 'sad' | 'sleeping' {
    if (status.energy <= 10) {
      return 'sleeping';
    }

    if (status.mood >= 70) {
      return 'happy';
    }

    if (status.mood <= 25 || status.hunger <= 25) {
      return 'sad';
    }

    return 'normal';
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

  private readStorage(): string | null {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }

    return globalThis.localStorage.getItem(TAMAGOTCHI_SELECTED_POKEMON_KEY);
  }

  private writeStorage(value: string): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return;
    }

    globalThis.localStorage.setItem(TAMAGOTCHI_SELECTED_POKEMON_KEY, value);
  }
}
