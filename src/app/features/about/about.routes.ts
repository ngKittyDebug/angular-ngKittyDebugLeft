import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const ABOUT_PATH = 'about';
export const aboutRoutes: Routes = [
  {
    path: 'about',
    loadComponent: () =>
      import('./ui/components/about-page/about-page.component').then((m) => m.AboutPageComponent),
    providers: [provideTranslocoScope('about')],
  },
];
