import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { TamagotchiSelectionService } from './data/services/tamagotchi-selection.service';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';

export { TAMAGOTCHI_PATH };

export const pokemonTamagotchiRoutes: Routes = [
  {
    path: TAMAGOTCHI_PATH,
    loadComponent: () =>
      import('./ui/components/pokemon-tamagotchi-page/pokemon-tamagotchi-page.component').then(
        (m) => m.PokemonTamagotchiPageComponent,
      ),
    providers: [
      provideTranslocoScope('pokemonTamagotchi'),
      { provide: TAMAGOTCHI_SELECTION_PORT, useExisting: TamagotchiSelectionService },
    ],
  },
];
