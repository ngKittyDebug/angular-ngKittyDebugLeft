import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, of } from 'rxjs';
import type { TamagotchiSelectionPort } from '@shared/constants/tamagotchi-selection.token';
import type {
  PokemonSelectionValidation,
  SelectedPokemonReference,
  TamagotchiSelectionPokemon,
} from '@shared/models/tamagotchi-selection.model';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import { validateTamagotchiPokemonSelection } from '../helpers/validate-tamagotchi-pokemon-selection.helper';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonSelectionValidation as FeaturePokemonSelectionValidation } from '../models/pokemon-selection.model';
import { TamagotchiSelectionStorageService } from './tamagotchi-selection-storage.service';

@Injectable({ providedIn: 'root' })
export class TamagotchiSelectionService implements TamagotchiSelectionPort {
  private readonly api = inject(PokemonTamagotchiApiService);
  private readonly storage = inject(TamagotchiSelectionStorageService);

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
    return validateTamagotchiPokemonSelection(pokemon);
  }

  public validateSelectedPokemon(): Observable<FeaturePokemonSelectionValidation> {
    const reference = this.getSelectedPokemonReference();

    if (!reference) {
      return of({ error: 'noSelection', valid: false });
    }

    return this.loadPokemonByName(reference.name).pipe(
      map((pokemon): FeaturePokemonSelectionValidation => {
        const validation = validateTamagotchiPokemonSelection(pokemon);

        if (!validation.valid) {
          return { error: validation.error, valid: false };
        }

        return { pokemon, valid: true };
      }),
      catchError(() =>
        of<FeaturePokemonSelectionValidation>({ error: 'loadFailed', valid: false }),
      ),
    );
  }
}
