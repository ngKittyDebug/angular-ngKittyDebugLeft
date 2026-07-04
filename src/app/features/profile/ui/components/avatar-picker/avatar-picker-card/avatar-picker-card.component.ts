import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { PokemonCardMiniComponent } from '../../pokemon-card-mini/pokemon-card-mini.component';

@Component({
  selector: 'left-paw-avatar-picker-card',
  imports: [PokemonCardMiniComponent],
  templateUrl: './avatar-picker-card.component.html',
  styleUrl: './avatar-picker-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerCardComponent {
  private readonly cardSprite = viewChild.required(PokemonCardMiniComponent);

  public readonly pokemonName = input.required<string>();
  public readonly selected = output<string>();

  protected onSelect(): void {
    const url = this.cardSprite().artworkUrl();

    if (url) {
      this.selected.emit(url);
    }
  }
}
