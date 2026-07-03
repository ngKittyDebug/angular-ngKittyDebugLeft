import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const TAMAGOTCHI_PATH = 'tamagotchi';

export const pokemonTamagotchiRoutes: Routes = [
  {
    path: TAMAGOTCHI_PATH,
    loadComponent: () =>
      import('./ui/components/pokemon-tamagotchi-page/pokemon-tamagotchi-page.component').then(
        (m) => m.PokemonTamagotchiPageComponent,
      ),
    providers: [provideTranslocoScope('pokemonTamagotchi')],
  },
];
