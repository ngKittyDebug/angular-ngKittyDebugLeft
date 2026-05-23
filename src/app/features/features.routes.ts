import type { Routes } from '@angular/router';
import { aboutRoutes } from './about/about.routes';
import { notFoundRoutes } from './not-found/not-found.routes';
import { mainCatalogRoutes } from './main-catalog/main-catalog.routes';

export const ChildrenRouts: Routes = [...mainCatalogRoutes, ...aboutRoutes, ...notFoundRoutes];
