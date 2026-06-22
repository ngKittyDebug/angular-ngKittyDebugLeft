import { TuiRoot } from '@taiga-ui/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { LoaderComponent } from '@shared/ui/components/loader/loader.component';
import { LoaderService } from '@core/services/loader.service';

@Component({
  selector: 'left-paw-app-root',
  imports: [RouterOutlet, TuiRoot, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly loaderService = inject(LoaderService);
  protected readonly isLoading = this.loaderService.isLoading;
  protected readonly darkMode = inject(TUI_DARK_MODE);
}
