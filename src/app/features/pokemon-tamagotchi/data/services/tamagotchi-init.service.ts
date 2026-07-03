import { inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { defer, filter, map, type Observable, of, switchMap, take } from 'rxjs';
import { TamagotchiStore } from '../store/tamagotchi.store';
import {
  PokemonProfileIntegrationService,
  type PokemonSelectionValidation,
} from './pokemon-profile-integration.service';

@Injectable({ providedIn: 'root' })
export class TamagotchiInitService {
  private readonly profileIntegration = inject(PokemonProfileIntegrationService);
  private readonly store = inject(TamagotchiStore);
  private readonly initialized$ = toObservable(this.store.initialized);

  public bootstrapFromProfile(): Observable<void> {
    return defer(() => {
      this.store.loadFromPersistence();

      if (this.store.initialized()) {
        return of(this.store.hasPokemon());
      }

      return this.initialized$.pipe(
        filter(Boolean),
        take(1),
        map(() => this.store.hasPokemon()),
      );
    }).pipe(
      switchMap((hasPersistedPokemon) => this.resolveProfileSelection(hasPersistedPokemon)),
      map((validation) => {
        if (validation.valid && validation.pokemon) {
          this.store.selectPokemon(validation.pokemon);
          this.profileIntegration.saveSelectedPokemon(validation.pokemon);

          return;
        }

        if (!validation.valid && validation.error) {
          this.store.setError(validation.error);
        }
      }),
    );
  }

  private resolveProfileSelection(
    hasPersistedPokemon: boolean,
  ): Observable<PokemonSelectionValidation> {
    if (!hasPersistedPokemon) {
      return this.profileIntegration.validateSelectedPokemon();
    }

    const selectedReference = this.profileIntegration.getSelectedPokemonReference();
    const persistedPokemon = this.store.pokemon();

    if (selectedReference && persistedPokemon && selectedReference.id !== persistedPokemon.id) {
      this.store.resetState();

      return this.profileIntegration.validateSelectedPokemon();
    }

    return of({ valid: true });
  }
}
