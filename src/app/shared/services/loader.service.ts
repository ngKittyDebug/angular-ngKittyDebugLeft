import { inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouteConfigLoadStart, Router } from '@angular/router';
import { map, of, switchMap, timer } from 'rxjs';

@Service()
export class LoaderService {
  private readonly router = inject(Router);
  public readonly isLoading = toSignal(
    this.router.events.pipe(
      map((event) => event instanceof RouteConfigLoadStart),
      switchMap((isStarted) => (isStarted ? timer(100).pipe(map(() => true)) : of(false))),
    ),
    { initialValue: false },
  );
}
