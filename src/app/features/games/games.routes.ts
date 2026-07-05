import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { authGuard } from '@shared/guards/auth.guard';

export const GAMES_PATH = 'games';

export const gamesRoutes: Routes = [
  {
    path: GAMES_PATH,
    loadComponent: () =>
      import('./ui/components/games-page/games-page.component').then((m) => m.GamesPageComponent),
    providers: [provideTranslocoScope('games')],
    canActivate: [authGuard],
  },
];
