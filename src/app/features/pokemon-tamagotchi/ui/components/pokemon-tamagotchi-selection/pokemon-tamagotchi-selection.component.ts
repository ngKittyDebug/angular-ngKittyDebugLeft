import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiNotification } from '@taiga-ui/core';
import { catchError, finalize, map, of } from 'rxjs';
import { TAMAGOTCHI_PATH } from '../../../pokemon-tamagotchi.routes';
import { PokemonProfileIntegrationService } from '../../../data/services/pokemon-profile-integration.service';

type SelectionFeedback = 'evolvedPokemon' | 'loadFailed' | 'saved' | null;

@Component({
  selector: 'left-paw-pokemon-tamagotchi-selection',
  imports: [RouterLink, TranslocoDirective, TuiButton, TuiNotification],
  templateUrl: './pokemon-tamagotchi-selection.component.html',
  styleUrl: './pokemon-tamagotchi-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTamagotchiSelectionComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileIntegration = inject(PokemonProfileIntegrationService);

  public readonly pokemonName = input.required<string>();

  protected readonly feedback = signal<SelectionFeedback>(null);
  protected readonly loading = signal(false);

  protected readonly tamagotchiRoute = `/${TAMAGOTCHI_PATH}`;

  protected readonly isCurrentSelection = computed(() => {
    const reference = this.profileIntegration.getSelectedPokemonReference();

    return reference?.name.toLowerCase() === this.pokemonName().toLowerCase();
  });

  protected selectForTamagotchi(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.feedback.set(null);

    this.profileIntegration
      .loadPokemonByName(this.pokemonName())
      .pipe(
        map((pokemon) => this.profileIntegration.validatePokemonSelection(pokemon)),
        catchError(() => of({ error: 'loadFailed' as const, valid: false as const })),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((validation) => {
        if (validation.valid && validation.pokemon) {
          this.profileIntegration.saveSelectedPokemon(validation.pokemon);
          this.feedback.set('saved');

          return;
        }

        this.feedback.set(validation.error === 'evolvedPokemon' ? 'evolvedPokemon' : 'loadFailed');
      });
  }
}
