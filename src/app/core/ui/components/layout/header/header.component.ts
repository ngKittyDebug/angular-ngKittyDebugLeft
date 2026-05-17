import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';
import type { NavListItem } from './model/nav-list-items';

const POKEMON_ICON_SRC = 'images/svg/pokeball.svg';

@Component({
  selector: 'left-paw-header',
  imports: [TuiLink, TuiIcon, TuiButton, TuiIcon],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public readonly navListItems = input<NavListItem[]>([]);
  protected readonly pokeDexIcoSrc = POKEMON_ICON_SRC;
}
