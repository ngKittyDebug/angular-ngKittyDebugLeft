import type { Routes } from '@angular/router';
import { authGuard } from '@shared/guards/auth.guard';
import { MainCatalogFacade } from './data/facades/main-catalog.facade';
import { PokemonPaginationStorageService } from './data/services/pokemon-pagination-storage.service';
import { PokemonPaginationService } from './data/services/pokemon-pagination.service';
import { PokemonStorageService } from './data/services/pokemon-storage.service';

export const mainCatalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/components/main-catalog-page/main-catalog-page.component').then(
        (m) => m.MainCatalogPageComponent,
      ),
    providers: [
      MainCatalogFacade,
      PokemonStorageService,
      PokemonPaginationService,
      PokemonPaginationStorageService,
    ],
    canActivate: [authGuard],
  },
];
