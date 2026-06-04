import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { TuiProgress } from '@taiga-ui/kit';
import type { OnInit } from '@angular/core';

@Component({
  selector: 'left-paw-favorites-card',
  imports: [TuiProgress],
  templateUrl: './favorites-card.component.html',
  styleUrl: './favorites-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesCardComponent implements OnInit {
  public readonly pokemonName = input.required<string>();
  protected readonly pokemonCardData = signal<PokemonDetailApiData | null>(null);

  public async ngOnInit() {
    try {
      const response = await fetch(`/mocks/${this.pokemonName()}.json`);

      // TODO вместо моков будет использоваться список любимых из юзера (наверное)
      if (!response.ok) {
        throw new Error('Ошибка сети');
      }
      const result: PokemonDetailApiData = (await response.json()) as PokemonDetailApiData;

      this.pokemonCardData.set(result);
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    }
  }
}
