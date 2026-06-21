import { TuiRoot } from '@taiga-ui/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { map, of, switchMap, timer } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '@shared/ui/components/loader/loader.component';

@Component({
  selector: 'left-paw-app-root',
  imports: [RouterOutlet, TuiRoot, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  protected readonly darkMode = inject(TUI_DARK_MODE);

  protected readonly isNavigating = toSignal(
    this.router.events.pipe(
      map((event) => event instanceof NavigationStart),
      switchMap((isStarted) => (isStarted ? timer(200).pipe(map(() => true)) : of(false))),
    ),
    { initialValue: false },
  );
}
