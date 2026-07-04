import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, of } from 'rxjs';
import type { TamagotchiSelectionPort } from '@shared/constants/tamagotchi-selection.token';
import type {
  SelectedPokemonReference,
  TamagotchiSelectionPokemon,
} from '@shared/models/tamagotchi-selection.model';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import { validateTamagotchiPokemonSelection } from '../helpers/validate-tamagotchi-pokemon-selection.helper';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonSelectionValidation } from '../models/pokemon-selection.model';
import { TamagotchiSelectionStorageService } from './tamagotchi-selection-storage.service';

@Injectable({ providedIn: 'root' })
export class TamagotchiSelectionService implements TamagotchiSelectionPort {
  private readonly api = inject(PokemonTamagotchiApiService);
  private readonly storage = inject(TamagotchiSelectionStorageService);

  public clearSelectedPokemon(): void {
    this.storage.clear();
  }

  public getSelectedPokemonReference(): SelectedPokemonReference | null {
    return this.storage.getReference();
  }

  public loadPokemonByName(nameOrId: string): Observable<PokemonModel> {
    return this.api.loadPokemonByName(nameOrId);
  }

  public saveSelectedPokemon(pokemon: TamagotchiSelectionPokemon): void {
    this.storage.save(pokemon);
  }

  public validatePokemonSelection(pokemon: TamagotchiSelectionPokemon): PokemonSelectionValidation {
    return validateTamagotchiPokemonSelection(pokemon) as PokemonSelectionValidation;
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
