import { DestroyRef, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, finalize, map, of } from 'rxjs';
import { AppNotificationService } from '@core/services/app-notification.service';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';

const TAMAGOTCHI_SELECTION_SCOPE = 'pokemonProfile.tamagotchiSelection';

@Service({ autoProvided: false })
export class TamagotchiSelectionFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(AppNotificationService);
  private readonly selectionPort = inject(TAMAGOTCHI_SELECTION_PORT);
  private readonly transloco = inject(TranslocoService);

  private readonly isSelectionLoadingState = signal(false);

  public readonly isSelectionLoading = this.isSelectionLoadingState.asReadonly();
  public readonly selectedPokemonName = signal<string | null>(
    this.selectionPort.getSelectedPokemonReference()?.name ?? null,
  );

  public selectForTamagotchi(pokemonName: string | undefined): void {
    if (!pokemonName || this.isSelectionLoading()) {
      return;
    }

    this.isSelectionLoadingState.set(true);

    this.selectionPort
      .loadPokemonByName(pokemonName)
      .pipe(
        map((pokemon) => this.selectionPort.validatePokemonSelection(pokemon)),
        catchError(() => of({ error: 'loadFailed' as const, valid: false as const })),
        finalize(() => this.isSelectionLoadingState.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((validation) => {
        if (validation.valid && validation.pokemon) {
          this.selectionPort.saveSelectedPokemon(validation.pokemon);
          this.selectedPokemonName.set(validation.pokemon.name);
          this.notifications.showPositiveNotification(
            this.transloco.translate(`${TAMAGOTCHI_SELECTION_SCOPE}.savedMessage`, {
              name: validation.pokemon.name,
            }),
          );

          return;
        }

        const errorKey =
          validation.error === 'evolvedPokemon' ? 'evolvedPokemonError' : 'loadFailedError';

        this.notifications.showErrorNotification(
          this.transloco.translate(`${TAMAGOTCHI_SELECTION_SCOPE}.${errorKey}`),
        );
      });
  }
}
