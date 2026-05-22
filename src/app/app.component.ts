import { TuiRoot } from '@taiga-ui/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeSwitcherService } from '@core/services/theme-switcher.service';

@Component({
  selector: 'left-paw-app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly themeService = inject(ThemeSwitcherService);
}
