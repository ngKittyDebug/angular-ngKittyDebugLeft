import type { Routes } from '@angular/router';
// import { authGuard } from '@shared/guards/auth.guard';
import { MainCatalogFacade } from './data/facades/main-catalog.facade';
import { PokemonPaginationStorageService } from './data/services/pokemon-pagination-storage.service';
import { PokemonPaginationService } from './data/services/pokemon-pagination.service';
import { PokemonFilterStorageService } from './data/services/pokemon-filter-storage.service';

export const MAIN_PATH = '';
export const mainCatalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/components/main-catalog-page/main-catalog-page.component').then(
        (m) => m.MainCatalogPageComponent,
      ),
    providers: [
      MainCatalogFacade,
      PokemonPaginationService,
      PokemonPaginationStorageService,
      PokemonFilterStorageService,
    ],
    // canActivate: [authGuard],
  },
];
