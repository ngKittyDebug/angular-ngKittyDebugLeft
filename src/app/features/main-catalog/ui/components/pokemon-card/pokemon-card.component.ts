import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

@Component({
  selector: 'left-paw-pokemon-card',
  imports: [],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardComponent implements OnInit {
  public readonly pokemonName = input<string>('pokemon');
  protected readonly pokemonCardData = signal<PokemonDetailApiData | null>(null);

  public async ngOnInit() {
    console.log('boom');
    try {
      const response = await fetch(`/mocks/${this.pokemonName()}.json`);

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const result: PokemonDetailApiData = (await response.json()) as PokemonDetailApiData;

      this.pokemonCardData.set(result);
      console.log(this.pokemonCardData());
      console.log(this.pokemonCardData()?.types);
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    }
  }
}
