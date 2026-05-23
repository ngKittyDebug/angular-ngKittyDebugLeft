import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'left-paw-pokemon-card',
  imports: [],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardComponent {}
