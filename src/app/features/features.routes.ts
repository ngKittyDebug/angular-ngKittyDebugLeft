import type { Routes } from '@angular/router';
import { aboutRoutes } from './about/about.routes';
import { notFoundRoutes } from './not-found/not-found.routes';
import { authRoutes } from './auth/auth.routes';
import { frenzyRoutes } from './frenzy/frenzy.routes';
import { mainCatalogRoutes } from './main-catalog/main-catalog.routes';
import { profileRoutes } from './profile/profile.routes';
import { pokemonProfileRoutes } from './pokemon-profile/pokemon-profile.routes';

export const ChildrenRouts: Routes = [
  ...mainCatalogRoutes,
  ...authRoutes,
  ...aboutRoutes,
  ...profileRoutes,
  ...pokemonProfileRoutes,
  ...frenzyRoutes,
  ...notFoundRoutes,
];
