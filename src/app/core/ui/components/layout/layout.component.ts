import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { RouterOutlet } from '@angular/router';
import { NAV_LIST_ITEMS } from './constans/nav-list';
import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'left-paw-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  protected readonly navListItems = NAV_LIST_ITEMS;
}
