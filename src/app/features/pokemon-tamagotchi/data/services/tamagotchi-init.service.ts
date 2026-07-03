import { inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { catchError, defer, filter, map, type Observable, of, switchMap, take } from 'rxjs';
import { environment } from '@environments/environment';
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
    if (hasPersistedPokemon) {
      return of({ valid: true });
    }

    return this.profileIntegration.validateSelectedPokemon().pipe(
      switchMap((validation: PokemonSelectionValidation) => {
        if (validation.valid && validation.pokemon) {
          return of(validation);
        }

        const previewPokemon = environment.tamagotchiPreviewPokemon;

        if (previewPokemon && validation.error === 'noSelection') {
          return this.profileIntegration.loadPokemonByName(previewPokemon).pipe(
            map((pokemon) => ({ pokemon, valid: true as const })),
            catchError(() => of(validation)),
          );
        }

        return of(validation);
      }),
    );
  }
}
