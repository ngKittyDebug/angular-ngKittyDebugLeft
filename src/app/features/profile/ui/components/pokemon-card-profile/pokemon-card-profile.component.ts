import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokemonCardMiniComponent } from '../pokemon-card-mini/pokemon-card-mini.component';

@Component({
  selector: 'left-paw-pokemon-card-profile',
  imports: [PokemonCardMiniComponent, RouterLink],
  templateUrl: './pokemon-card-profile.component.html',
  styleUrl: './pokemon-card-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardProfileComponent {
  public readonly pokemonName = input.required<string>();
}
