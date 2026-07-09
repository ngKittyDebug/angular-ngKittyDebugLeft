import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeaderComponent } from './header/header.component';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import type { Data } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NAV_LIST_ITEMS } from './constants/nav-list';
import { FooterComponent } from './footer/footer.component';
import { TuiTabBar } from '@taiga-ui/addon-mobile';
import { TranslocoDirective } from '@jsverse/transloco';
import { ResponsiveRenderDirective } from '@shared/directives/responsive-render.directive';
import { TABLE_BREAKPOINT } from './constants/breakpoints';
import { HideContentDirective } from '@shared/directives/hide-content.directive';
import { MascotComponent } from '../mascot/mascot.component';

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
    MascotComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.layout--immersive]': 'immersive()',
  },
})
export class LayoutComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly tableBreakpoint = TABLE_BREAKPOINT;
  protected readonly navListItems = NAV_LIST_ITEMS;

  // A routed child can opt into an immersive, fixed-viewport shell via `data: { immersive: true }`
  // (Frenzy does). The host class then pins the layout to a definite viewport height — see the SCSS.
  protected readonly immersive = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.leafRouteData()['immersive'] === true),
    ),
    { initialValue: false },
  );

  // Null-safe: during the synchronous `startWith` emission (component construction) the child route's
  // `snapshot` may not be populated yet — guard so the stream never errors; the NavigationEnd that follows
  // re-evaluates with the resolved tree.
  private leafRouteData(): Data {
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    return route?.snapshot?.data ?? {};
  }
}
