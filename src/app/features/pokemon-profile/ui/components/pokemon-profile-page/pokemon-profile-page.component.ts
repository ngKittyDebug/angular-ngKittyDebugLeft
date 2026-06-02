import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';
import { TuiArcChart } from '@taiga-ui/addon-charts';
import { TuiCard } from '@taiga-ui/layout';
import type {
  EvolutionChainItem,
  EvolutionChainResponse,
} from '@shared/models/pokemon-evolution-chain-api-data-interface';
import { EvolutionChainItemComponent } from '../evolution-chain-item/evolution-chain-item/evolution-chain-item.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { PokemonProfileInfoComponent } from '../pokemon-profile-info/pokemon-profile-info/pokemon-profile-info.component';

export interface MyEvolutionNode {
  name: string;
  image: string;
  condition: string | null;
  children: MyEvolutionNode[];
}

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [
    TuiBadge,
    TuiButton,
    TuiProgress,
    TuiArcChart,
    TuiCard,
    EvolutionChainItemComponent,
    PokemonProfileInfoComponent,
    TranslocoDirective,
  ],
  templateUrl: './pokemon-profile-page.component.html',
  styleUrl: './pokemon-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfilePageComponent implements OnInit {
  public readonly pokemonEndpoint = 'bulbasaur'; // bulbasaur | eevee
  protected readonly pokemonProfileData = signal<PokemonDetailApiData | null>(null);
  protected readonly pokemonProfileDataSpecies = signal<PokemonSpeciesApiData | null>(null);
  protected readonly pokemonProfileEvolutionChainData = signal<EvolutionChainResponse | null>(null);

  protected readonly pokemonTotalStats = computed(() => {
    return this.pokemonProfileData()?.stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);
  });
  protected readonly chartValue = [56, 45, 51, 64, 65, 70]; // переделать
  protected readonly pokemonEvolutionChain = computed(() => {
    const data = this.pokemonProfileEvolutionChainData()?.chain as EvolutionChainItem;
    const result = this.buildStructure(data);

    return result;
  });

  public async ngOnInit() {
    try {
      const response = await fetch(`/mocks/${this.pokemonEndpoint}.json`);
      const responseSpecies = await fetch(`/mocks/${this.pokemonEndpoint}-species.json`);
      const responseChain = await fetch(`/mocks/${this.pokemonEndpoint}-evolution-chain.json`);

      if (!response.ok || !responseSpecies.ok || !responseChain.ok) {
        throw new Error('Ошибка сети');
      }

      const result: PokemonDetailApiData = (await response.json()) as PokemonDetailApiData;
      const resultSpecies: PokemonSpeciesApiData =
        (await responseSpecies.json()) as PokemonSpeciesApiData;
      const resultChain: EvolutionChainResponse =
        (await responseChain.json()) as EvolutionChainResponse;

      this.pokemonProfileData.set(result);
      this.pokemonProfileDataSpecies.set(resultSpecies);
      this.pokemonProfileEvolutionChainData.set(resultChain);

      // console.log(this.pokemonProfileData());
      // console.log(this.pokemonProfileDataSpecies());
      // console.log(this.pokemonTotalStats());
      console.log(this.pokemonProfileEvolutionChainData());
      //
      // console.log(this.pokemonProfileEvolutionChainData()?.chain);
      console.log(this.pokemonEvolutionChain());
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    }
  }

  private buildStructure(node: EvolutionChainItem): MyEvolutionNode | null {
    if (!node || !node.species) {
      return null; // ← Главная защита
    }

    const detail = node.evolution_details?.[0];
    const condition = detail?.min_level ? `Lv. ${detail.min_level}` : detail?.trigger?.name || null;

    const children: MyEvolutionNode[] = (node.evolves_to || [])
      .map((child: EvolutionChainItem) => this.buildStructure(child))
      .filter((c): c is MyEvolutionNode => c !== null);

    return {
      name: node.species.name,
      image: '',
      condition,
      children,
    };
  }
}
