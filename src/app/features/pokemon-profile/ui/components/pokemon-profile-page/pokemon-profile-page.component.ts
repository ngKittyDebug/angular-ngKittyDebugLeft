import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import { EvolutionChainItemComponent } from './evolution-chain-item/evolution-chain-item.component';
import { PokemonTamagotchiSelectionComponent } from '@features/pokemon-tamagotchi/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';
import { PokemonProfileInfoComponent } from './pokemon-profile-info/pokemon-profile-info.component';
import { PokemonProfileStatsComponent } from './pokemon-profile-stats/pokemon-profile-stats.component';
import { PokemonProfileSpeciesBreedingComponent } from './pokemon-profile-species-breeding/pokemon-profile-species-breeding.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { convertEvolutionChainToNodeModel } from '@features/pokemon-profile/data/helpers/convert-evolution-chain';

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [
    PokemonTamagotchiSelectionComponent,
    TuiProgress,
    TuiCard,
    EvolutionChainItemComponent,
    PokemonProfileInfoComponent,
    PokemonProfileStatsComponent,
    PokemonProfileSpeciesBreedingComponent,
    TranslocoDirective,
  ],
  templateUrl: './pokemon-profile-page.component.html',
  styleUrl: './pokemon-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfilePageComponent {
  private readonly profileService = inject(PokemonDataService);

  public readonly pokemonEndpoint = input.required<string>();

  protected readonly pokemonProfile = this.profileService.createPokemonProfileData(() =>
    this.pokemonEndpoint().toLowerCase(),
  );

  protected readonly pokemonEvolutionChain = computed(() => {
    const data = this.pokemonProfile.profileEvolution()?.chain;

    return data ? convertEvolutionChainToNodeModel(data) : null;
  });
}
