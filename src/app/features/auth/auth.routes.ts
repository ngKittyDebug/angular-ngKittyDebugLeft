import type { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./ui/components/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
  },
];
