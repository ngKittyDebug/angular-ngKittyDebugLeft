import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';
import type { NavListItem } from '../model/nav-list-items';
import { LanguageSwitcher } from '@core/services/transloco.service';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { ThemeSwitcherService } from '@core/services/theme-switcher.service';

const POKEMON_ICON_SRC = 'images/svg/pokeball.svg';

@Component({
  selector: 'left-paw-header',
  imports: [TuiLink, TuiIcon, TuiButton, TuiIcon, TranslocoDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideTranslocoScope('header')],
})
export class HeaderComponent {
  public readonly navListItems = input<NavListItem[]>([]);
  protected readonly themeService = inject(ThemeSwitcherService);
  protected readonly pokeDexIcoSrc = POKEMON_ICON_SRC;
  protected language = inject(LanguageSwitcher);
}
