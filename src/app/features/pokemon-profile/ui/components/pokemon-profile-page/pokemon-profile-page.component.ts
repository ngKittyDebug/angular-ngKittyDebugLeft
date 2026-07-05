import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import { convertEvolutionChainToNodeModel } from '@features/pokemon-profile/data/helpers/convert-evolution-chain';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { EvolutionChainItemComponent } from './evolution-chain-item/evolution-chain-item.component';
import { PokemonProfileInfoComponent } from './pokemon-profile-info/pokemon-profile-info.component';
import { PokemonProfileStatsComponent } from './pokemon-profile-stats/pokemon-profile-stats.component';
import { PokemonProfileSpeciesBreedingComponent } from './pokemon-profile-species-breeding/pokemon-profile-species-breeding.component';

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [
    EvolutionChainItemComponent,
    PokemonProfileInfoComponent,
    PokemonProfileSpeciesBreedingComponent,
    PokemonProfileStatsComponent,
    TranslocoDirective,
    TuiCard,
    TuiProgress,
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
