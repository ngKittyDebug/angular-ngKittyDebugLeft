import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PokemonDataService } from '@shared/services/pokemon-data.service';

@Component({
  selector: 'left-paw-pokemon-card-mini',
  templateUrl: './pokemon-card-mini.component.html',
  styleUrl: './pokemon-card-mini.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardMiniComponent {
  public readonly pokemonName = input.required<string>();

  public readonly artworkUrl = computed(
    () => this.pokemon.cardData()?.sprites?.other?.['official-artwork']?.front_default ?? null,
  );

  protected readonly pokemon = inject(PokemonDataService).createPokemonCardData(() =>
    this.pokemonName(),
  );
}
