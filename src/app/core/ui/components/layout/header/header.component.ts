import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiLink } from '@taiga-ui/core';

const POKEMON_ICON_SRC = 'images/svg/pokeball.svg';

@Component({
  selector: 'left-paw-header',
  imports: [TuiLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public readonly pokeDexIcoSrc = input<string>(POKEMON_ICON_SRC);
}
