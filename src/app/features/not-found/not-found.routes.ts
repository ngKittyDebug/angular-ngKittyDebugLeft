import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const notFoundRoutes: Routes = [
  {
    path: '**',
    loadComponent: () =>
      import('./ui/components/not-found-page/not-found-page.component').then(
        (m) => m.NotFoundPageComponent,
      ),
    providers: [provideTranslocoScope('notFound')],
  },
];
