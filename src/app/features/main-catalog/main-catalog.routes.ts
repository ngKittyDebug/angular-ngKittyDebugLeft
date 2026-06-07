import type { Routes } from '@angular/router';
import { authGuard } from '@shared/guards/auth.guard';
import { MainCatalogFacade } from './data/facades/main-catalog.facade';

export const mainCatalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/components/main-catalog-page/main-catalog-page.component').then(
        (m) => m.MainCatalogPageComponent,
      ),
    providers: [MainCatalogFacade],
    canActivate: [authGuard],
  },
];
