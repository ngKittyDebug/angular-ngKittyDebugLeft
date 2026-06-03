import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const mainCatalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/components/main-catalog-page/main-catalog-page.component').then(
        (m) => m.MainCatalogPageComponent,
      ),
    canActivate: [authGuard],
  },
];
