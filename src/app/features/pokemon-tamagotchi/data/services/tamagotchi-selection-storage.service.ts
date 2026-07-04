import { inject, Injectable } from '@angular/core';
import type {
  SelectedPokemonReference,
  TamagotchiSelectionPokemon,
} from '@shared/models/tamagotchi-selection.model';
import { TamagotchiPersistenceService } from './tamagotchi-persistence.service';
import { TamagotchiStorageService } from './tamagotchi-storage.service';

export const TAMAGOTCHI_SELECTED_POKEMON_KEY = 'pokemon-tamagotchi-selected-pokemon';

@Injectable({ providedIn: 'root' })
export class TamagotchiSelectionStorageService {
  private readonly persistence = inject(TamagotchiPersistenceService);
  private readonly storage = inject(TamagotchiStorageService);

  public clear(): void {
    this.storage.removeItem(TAMAGOTCHI_SELECTED_POKEMON_KEY);
  }

  public getReference(): SelectedPokemonReference | null {
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

  public save(pokemon: TamagotchiSelectionPokemon): void {
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
}
