import type { Routes } from '@angular/router';
import { aboutRoutes } from './about/about.routes';
import { notFoundRoutes } from './not-found/not-found.routes';

export const ChildrenRouts: Routes = [...aboutRoutes, ...notFoundRoutes];
