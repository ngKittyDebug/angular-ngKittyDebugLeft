import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-pokemon-card',
  imports: [TuiProgress, TuiBadge],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardComponent implements OnInit {
  public readonly pokemonName = input.required<string>();
  protected readonly pokemonCardData = signal<PokemonDetailApiData | null>(null);
  protected readonly pokemonLimitedStats = computed(() => {
    const data = this.pokemonCardData();

    return data?.stats?.slice(0, 3) ?? [];
  });

  public async ngOnInit() {
    try {
      const response = await fetch(`/mocks/${this.pokemonName()}.json`);

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const result: PokemonDetailApiData = (await response.json()) as PokemonDetailApiData;

      this.pokemonCardData.set(result);

      console.log(this.pokemonCardData());
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    }
  }
}
