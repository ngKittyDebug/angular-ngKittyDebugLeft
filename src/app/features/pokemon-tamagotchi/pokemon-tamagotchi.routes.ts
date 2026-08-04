import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { authGuard } from '@shared/guards/auth.guard';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';
import { POKEMON_TAMAGOTCHI_PROVIDERS } from './pokemon-tamagotchi.providers';

export { TAMAGOTCHI_PATH };

export const pokemonTamagotchiRoutes: Routes = [
  {
    path: TAMAGOTCHI_PATH,
    loadComponent: () =>
      import('./ui/components/pokemon-tamagotchi-page/pokemon-tamagotchi-page.component').then(
        (m) => m.PokemonTamagotchiPageComponent,
      ),
    providers: [provideTranslocoScope('pokemonTamagotchi'), ...POKEMON_TAMAGOTCHI_PROVIDERS],
    canActivate: [authGuard],
  },
];
