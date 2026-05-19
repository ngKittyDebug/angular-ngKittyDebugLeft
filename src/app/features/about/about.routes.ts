import type { Routes } from '@angular/router';

export const aboutRoutes: Routes = [
  {
    path: 'about',
    loadComponent: () =>
      import('./ui/components/about-page/about-page.component').then((m) => m.AboutPageComponent),
  },
];
