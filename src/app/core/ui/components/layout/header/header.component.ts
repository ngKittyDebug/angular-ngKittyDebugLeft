import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TuiButton, TuiDropdown, TuiIcon, TuiLink } from '@taiga-ui/core';
import type { NavListItem } from '../model/nav-list-items';
import { LanguageSwitcherService } from '@core/services/language-switcher.service';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { ThemeSwitcherService } from '@core/services/theme-switcher.service';
import { TuiButtonSelect, TuiDataListWrapper } from '@taiga-ui/kit';
import { FormsModule } from '@angular/forms';

const POKEMON_ICON_SRC = 'images/svg/pokeball.svg';

@Component({
  selector: 'left-paw-header',
  imports: [
    TuiLink,
    TuiIcon,
    TuiButton,
    TuiIcon,
    FormsModule,
    TranslocoDirective,
    TuiButtonSelect,
    TuiDataListWrapper,
    TuiDropdown,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideTranslocoScope('header')],
})
export class HeaderComponent {
  public readonly navListItems = input<NavListItem[]>([]);

  protected readonly themeService = inject(ThemeSwitcherService);
  protected readonly language = inject(LanguageSwitcherService);

  protected readonly pokeDexIcoSrc = POKEMON_ICON_SRC;
  protected readonly value = this.language.currentLanguage();
}
