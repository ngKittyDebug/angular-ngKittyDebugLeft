import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NAV_LIST_ITEMS } from './constants/nav-list';
import { FooterComponent } from './footer/footer.component';
import { TuiTabBar } from '@taiga-ui/addon-mobile';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { ResponseDirective } from '@shared/directives/response.directive';
import { TABLE_BREAKPOINT } from './constants/breacpoints';

@Component({
  selector: 'left-paw-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    HeaderComponent,
    FooterComponent,
    TuiTabBar,
    TranslocoDirective,
    ResponseDirective,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideTranslocoScope('header')],
})
export class LayoutComponent {
  protected readonly tableBreakpoint = TABLE_BREAKPOINT;
  protected readonly navListItems = NAV_LIST_ITEMS;
}
