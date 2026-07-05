import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiButtonLoading } from '@taiga-ui/kit';
import { catchError, finalize, map, of } from 'rxjs';
import { ProfileFacade } from '@features/profile/data/facades/profile.facade';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { DivideByTenPipe } from '@shared/pipes/divide-by-ten.pipe';
import {
  PokemonTamagotchiSelectionComponent,
  type TamagotchiSelectionFeedback,
} from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';

@Component({
  selector: 'left-paw-pokemon-profile-info',
  imports: [
    DivideByTenPipe,
    PokemonTamagotchiSelectionComponent,
    TranslocoDirective,
    TuiBadge,
    TuiButton,
    TuiButtonLoading,
  ],
  templateUrl: './pokemon-profile-info.component.html',
  styleUrl: './pokemon-profile-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfileInfoComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectionPort = inject(TAMAGOTCHI_SELECTION_PORT);

  public readonly pokemonProfileData = input.required<PokemonDetailApiData>();

  protected readonly profileFacade = inject(ProfileFacade);
  protected readonly tamagotchiRoute = `/${TAMAGOTCHI_PATH}`;
  protected readonly selectionFeedback = signal<TamagotchiSelectionFeedback>(null);
  protected readonly isSelectionLoading = signal(false);
  protected readonly selectedPokemonName = signal<string | null>(
    this.selectionPort.getSelectedPokemonReference()?.name ?? null,
  );

  protected readonly isFavorite = computed(() => {
    const currentName = this.pokemonProfileData()?.name;

    if (!currentName) {
      return false;
    }

    return (this.profileFacade.favoritePokemonList() ?? []).some(
      (name) => name.toLowerCase() === currentName.toLowerCase(),
    );
  });

  protected readonly isCurrentTamagotchiSelection = computed(() => {
    const selected = this.selectedPokemonName();
    const currentName = this.pokemonProfileData()?.name;

    if (!selected || !currentName) {
      return false;
    }

    return selected.toLowerCase() === currentName.toLowerCase();
  });

  public ngOnInit(): void {
    this.profileFacade.loadFavorites();
  }

  protected onFavoriteClick(): void {
    const pokemonName = this.pokemonProfileData()?.name;

    if (!pokemonName) {
      return;
    }

    this.profileFacade.toggleFavorite(pokemonName);
  }

  protected onTamagotchiSelectRequested(): void {
    const pokemonName = this.pokemonProfileData()?.name;

    if (!pokemonName || this.isSelectionLoading()) {
      return;
    }

    this.isSelectionLoading.set(true);
    this.selectionFeedback.set(null);

    this.selectionPort
      .loadPokemonByName(pokemonName)
      .pipe(
        map((pokemon) => this.selectionPort.validatePokemonSelection(pokemon)),
        catchError(() => of({ error: 'loadFailed' as const, valid: false as const })),
        finalize(() => this.isSelectionLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((validation) => {
        if (validation.valid && validation.pokemon) {
          this.selectionPort.saveSelectedPokemon(validation.pokemon);
          this.selectedPokemonName.set(validation.pokemon.name);
          this.selectionFeedback.set('saved');

          return;
        }

        this.selectionFeedback.set(
          validation.error === 'evolvedPokemon' ? 'evolvedPokemon' : 'loadFailed',
        );
      });
  }
}
