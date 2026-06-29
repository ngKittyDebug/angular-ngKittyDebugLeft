import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const POKEMON_BATTLE_PATH = 'pokemon-battle';
export const pokemonBattleRoutes: Routes = [
  {
    path: POKEMON_BATTLE_PATH,
    providers: [provideTranslocoScope('pokemon-battle')],
    loadComponent: () =>
      import('./ui/components/pokemon-battle-page/pokemon-battle-page.component').then(
        (m) => m.PokemonBattlePageComponent,
      ),
  },
];
