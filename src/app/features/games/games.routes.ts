import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { authGuard } from '@shared/guards/auth.guard';
import { frenzyRoutes } from '@features/frenzy/frenzy.routes';
import { pokemonBattleRoutes } from '@features/pokemon-battle/pokemon-battle.routes';
import { pokemonTamagotchiRoutes } from '@features/pokemon-tamagotchi/pokemon-tamagotchi.routes';

export const GAMES_PATH = 'games';

export const gamesRoutes: Routes = [
  {
    path: GAMES_PATH,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./ui/components/games-page/games-page.component').then(
            (m) => m.GamesPageComponent,
          ),
        providers: [provideTranslocoScope('games')],
        canActivate: [authGuard],
      },
      ...frenzyRoutes,
      ...pokemonTamagotchiRoutes,
      ...pokemonBattleRoutes,
    ],
  },
];
