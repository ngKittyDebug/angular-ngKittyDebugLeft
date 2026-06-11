import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import type { EvolutionChainItem } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import { EvolutionChainItemComponent } from './evolution-chain-item/evolution-chain-item/evolution-chain-item.component';
import { PokemonProfileInfoComponent } from './pokemon-profile-info/pokemon-profile-info/pokemon-profile-info.component';
import { PokemonProfileStatsComponent } from './pokemon-profile-stats/pokemon-profile-stats/pokemon-profile-stats.component';
import { PokemonProfileSpeciesBreedingComponent } from './pokemon-profile-species-breeding/pokemon-profile-species-breeding.component';
import { PokemonProfileService } from '@features/pokemon-profile/data/services/pokemon-profile.service';

export interface EvolutionNodeModel {
  name: string;
  image: string;
  condition: string | null;
  children: EvolutionNodeModel[];
}

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [
    TuiProgress,
    TuiCard,
    EvolutionChainItemComponent,
    PokemonProfileInfoComponent,
    PokemonProfileStatsComponent,
    PokemonProfileSpeciesBreedingComponent,
  ],
  templateUrl: './pokemon-profile-page.component.html',
  styleUrl: './pokemon-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfilePageComponent {
  private readonly profileService = inject(PokemonProfileService);

  public readonly pokemonEndpoint = input.required<string>();

  protected readonly pokemonProfile = this.profileService.createPokemonProfile(() =>
    this.pokemonEndpoint().toLowerCase(),
  );

  protected readonly pokemonTotalStats = computed(() => {
    return this.pokemonProfile
      .profileData()
      ?.stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);
  });

  protected readonly pokemonEvolutionChain = computed(() => {
    const data = this.pokemonProfile.profileEvolution()?.chain;

    return data ? this.buildStructure(data) : null;
  });

  private buildStructure(node: EvolutionChainItem): EvolutionNodeModel | null {
    if (!node || !node.species) {
      return null;
    }

    const detail = node.evolution_details?.[0];
    const condition = detail?.min_level ? `Lv. ${detail.min_level}` : detail?.trigger?.name || null;

    const children: EvolutionNodeModel[] = (node.evolves_to || [])
      .map((child: EvolutionChainItem) => this.buildStructure(child))
      .filter((c): c is EvolutionNodeModel => c !== null);

    return {
      name: node.species.name,
      image: '',
      condition,
      children,
    };
  }
}
