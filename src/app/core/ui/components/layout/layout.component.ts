import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NAV_LIST_ITEMS } from './constants/nav-list';
import { FooterComponent } from './footer/footer.component';
import { TuiTabBar } from '@taiga-ui/addon-mobile';
import { TranslocoDirective } from '@jsverse/transloco';
import { ResponsiveRenderDirective } from '@shared/directives/responsive-render.directive';
import { TABLE_BREAKPOINT } from './constants/breakpoints';
import { HideContentDirective } from '@shared/directives/hide-content.directive';

@Component({
  selector: 'left-paw-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    HeaderComponent,
    FooterComponent,
    TuiTabBar,
    TranslocoDirective,
    ResponsiveRenderDirective,
    HideContentDirective,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  protected readonly tableBreakpoint = TABLE_BREAKPOINT;
  protected readonly navListItems = NAV_LIST_ITEMS;
}
