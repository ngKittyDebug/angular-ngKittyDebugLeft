import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { PokemonDataService } from '@shared/services/pokemon-data.service';

@Component({
  selector: 'left-paw-avatar-picker-card',
  templateUrl: './avatar-picker-card.component.html',
  styleUrl: './avatar-picker-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerCardComponent {
  public readonly pokemonName = input.required<string>();
  public readonly selected = output<string>();

  protected readonly pokemon = inject(PokemonDataService).createPokemonCardData(() =>
    this.pokemonName(),
  );

  protected onSelect(): void {
    const artworkUrl = this.pokemon.cardData()?.sprites?.other?.['official-artwork']?.front_default;

    if (artworkUrl) {
      this.selected.emit(artworkUrl);
    }
  }
}
