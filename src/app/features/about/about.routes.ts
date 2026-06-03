import type { Routes } from '@angular/router';
import { guestGuard } from '@core/guards/guest.guard';
import { provideTranslocoScope } from '@jsverse/transloco';

export const aboutRoutes: Routes = [
  {
    path: 'about',
    loadComponent: () =>
      import('./ui/components/about-page/about-page.component').then((m) => m.AboutPageComponent),
    canActivate: [guestGuard],
    providers: [provideTranslocoScope('about')],
  },
];
