import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, filter, map, type Observable, of, switchMap, take } from 'rxjs';
import { environment } from '@environments/environment';
import * as TamagotchiActions from '../store/tamagotchi.actions';
import { selectHasPokemon, selectIsInitialized } from '../store/tamagotchi.selectors';
import {
  PokemonProfileIntegrationService,
  type PokemonSelectionValidation,
} from './pokemon-profile-integration.service';

@Injectable({ providedIn: 'root' })
export class TamagotchiInitService {
  private readonly profileIntegration = inject(PokemonProfileIntegrationService);
  private readonly store = inject(Store);

  public bootstrapFromProfile(): Observable<void> {
    this.store.dispatch(TamagotchiActions.loadState());

    return this.store.select(selectIsInitialized).pipe(
      filter(Boolean),
      take(1),
      switchMap(() => this.store.select(selectHasPokemon).pipe(take(1))),
      switchMap((hasPersistedPokemon) => this.resolveProfileSelection(hasPersistedPokemon)),
      map((validation) => {
        if (validation.valid && validation.pokemon) {
          this.store.dispatch(TamagotchiActions.selectPokemon({ pokemon: validation.pokemon }));
          this.profileIntegration.saveSelectedPokemon(validation.pokemon);

          return;
        }

        if (!validation.valid && validation.error) {
          this.store.dispatch(TamagotchiActions.setError({ error: validation.error }));
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
