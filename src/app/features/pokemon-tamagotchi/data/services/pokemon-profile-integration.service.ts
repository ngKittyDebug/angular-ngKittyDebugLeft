import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, of } from 'rxjs';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import type { PokemonModel } from '../models/pokemon.model';
import { TamagotchiPersistenceService } from './tamagotchi-persistence.service';
import { TamagotchiStorageService } from './tamagotchi-storage.service';

export const TAMAGOTCHI_SELECTED_POKEMON_KEY = 'pokemon-tamagotchi-selected-pokemon';

export interface SelectedPokemonReference {
  id: string;
  name: string;
  species: string;
}

export type PokemonSelectionError = 'evolvedPokemon' | 'loadFailed' | 'noSelection';

export interface PokemonSelectionValidation {
  error?: PokemonSelectionError;
  pokemon?: PokemonModel;
  valid: boolean;
}

@Injectable({ providedIn: 'root' })
export class PokemonProfileIntegrationService {
  private readonly api = inject(PokemonTamagotchiApiService);
  private readonly persistence = inject(TamagotchiPersistenceService);
  private readonly storage = inject(TamagotchiStorageService);

  public getSelectedPokemonReference(): SelectedPokemonReference | null {
    const raw = this.storage.getItem(TAMAGOTCHI_SELECTED_POKEMON_KEY);

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

  public saveSelectedPokemon(pokemon: PokemonModel): void {
    const persistedPokemonId = this.persistence.load()?.state.pokemon?.id ?? null;

    if (persistedPokemonId !== null && persistedPokemonId !== pokemon.id) {
      this.persistence.clear();
    }

    const reference: SelectedPokemonReference = {
      id: pokemon.id,
      name: pokemon.name,
      species: pokemon.species,
    };

    this.storage.setItem(TAMAGOTCHI_SELECTED_POKEMON_KEY, JSON.stringify(reference));
  }

  public clearSelectedPokemon(): void {
    this.storage.removeItem(TAMAGOTCHI_SELECTED_POKEMON_KEY);
  }

  public loadPokemonByName(nameOrId: string): Observable<PokemonModel> {
    return this.api.loadPokemonByName(nameOrId);
  }

  public isFirstStagePokemon(pokemon: PokemonModel): boolean {
    return pokemon.isFirstStage;
  }

  public validatePokemonSelection(pokemon: PokemonModel): PokemonSelectionValidation {
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
}
