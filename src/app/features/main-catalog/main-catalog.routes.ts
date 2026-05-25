import type { Routes } from '@angular/router';

export const mainCatalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/components/main-catalog-page/main-catalog-page.component').then(
        (m) => m.MainCatalogPageComponent,
      ),
  },
];
