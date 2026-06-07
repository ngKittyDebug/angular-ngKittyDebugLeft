import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { OnInit } from '@angular/core';

@Component({
  selector: 'left-paw-pokemon-card-profile',
  templateUrl: './pokemon-card-profile.component.html',
  styleUrl: './pokemon-card-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardProfileComponent implements OnInit {
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
