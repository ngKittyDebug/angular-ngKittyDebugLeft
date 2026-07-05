import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  PokemonSelectionValidation,
  SelectedPokemonReference,
  TamagotchiSelectionPokemon,
} from '@shared/models/tamagotchi-selection.model';

export interface TamagotchiSelectionPort {
  getSelectedPokemonReference(): SelectedPokemonReference | null;
  loadPokemonByName(nameOrId: string): Observable<TamagotchiSelectionPokemon>;
  saveSelectedPokemon(pokemon: TamagotchiSelectionPokemon): void;
  validatePokemonSelection(pokemon: TamagotchiSelectionPokemon): PokemonSelectionValidation;
}

export const TAMAGOTCHI_SELECTION_PORT = new InjectionToken<TamagotchiSelectionPort>(
  'TAMAGOTCHI_SELECTION_PORT',
);
