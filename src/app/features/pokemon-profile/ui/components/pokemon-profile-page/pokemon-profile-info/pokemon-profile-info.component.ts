import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiButtonLoading } from '@taiga-ui/kit';
import { TamagotchiSelectionFacade } from '@features/pokemon-profile/data/facades/tamagotchi-selection.facade';
import { ProfileFacade } from '@features/profile/data/facades/profile.facade';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { DivideByTenPipe } from '@shared/pipes/divide-by-ten.pipe';
import { PokemonTamagotchiSelectionComponent } from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';

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
  public readonly pokemonProfileData = input.required<PokemonDetailApiData>();

  protected readonly profileFacade = inject(ProfileFacade);
  protected readonly selectionFacade = inject(TamagotchiSelectionFacade);
  protected readonly tamagotchiRoute = `/${TAMAGOTCHI_PATH}`;

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
    const selected = this.selectionFacade.selectedPokemonName();
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
    this.selectionFacade.selectForTamagotchi(this.pokemonProfileData()?.name);
  }
}
