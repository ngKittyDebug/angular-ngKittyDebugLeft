import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'left-paw-pokemon-tamagotchi-page',
  imports: [TranslocoDirective],
  templateUrl: './pokemon-tamagotchi-page.component.html',
  styleUrl: './pokemon-tamagotchi-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTamagotchiPageComponent {}
