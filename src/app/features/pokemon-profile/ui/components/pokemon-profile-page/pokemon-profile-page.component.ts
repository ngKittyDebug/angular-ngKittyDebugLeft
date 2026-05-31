import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [TuiBadge, TuiButton, TuiProgress],
  templateUrl: './pokemon-profile-page.component.html',
  styleUrl: './pokemon-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfilePageComponent implements OnInit {
  public readonly pokemonEndpoint = 'bulbasaur';
  protected readonly pokemonProfileData = signal<PokemonDetailApiData | null>(null);
  protected readonly pokemonProfileDataSpecies = signal<PokemonSpeciesApiData | null>(null);
  protected readonly pokemonWeight = computed(() => {
    const weight = Number(this.pokemonProfileData()?.weight) / 10;

    return weight;
  });
  protected readonly pokemonHeight = computed(() => {
    const height = Number(this.pokemonProfileData()?.height) / 10;

    return height;
  });
  protected readonly pokemonTotalStats = computed(() => {
    return this.pokemonProfileData()?.stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);
  });

  public async ngOnInit() {
    try {
      const response = await fetch(`/mocks/${this.pokemonEndpoint}.json`);
      const responeSpecies = await fetch(`/mocks/${this.pokemonEndpoint}-species.json`);

      if (!response.ok || !responeSpecies.ok) {
        throw new Error('Ошибка сети');
      }

      const result: PokemonDetailApiData = (await response.json()) as PokemonDetailApiData;
      const resultSpecies: PokemonSpeciesApiData =
        (await responeSpecies.json()) as PokemonSpeciesApiData;

      this.pokemonProfileData.set(result);
      this.pokemonProfileDataSpecies.set(resultSpecies);

      console.log(this.pokemonProfileData());
      console.log(this.pokemonProfileDataSpecies());
      console.log(this.pokemonTotalStats());
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    }
  }
}
