import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

const POKEMON_ICON_SRC = 'images/svg/pokeball.svg';

@Component({
  selector: 'left-paw-auth-page',
  imports: [RouterOutlet, TranslocoPipe],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent {
  protected readonly pokeDexLogoSrc = POKEMON_ICON_SRC;
}
