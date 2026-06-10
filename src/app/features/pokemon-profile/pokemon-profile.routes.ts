import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const pokemonProfileRoutes: Routes = [
  {
    path: 'pokemon/:pokemonEndpoint',
    loadComponent: () =>
      import('./ui/components/pokemon-profile-page/pokemon-profile-page.component').then(
        (m) => m.PokemonProfilePageComponent,
      ),
    providers: [provideTranslocoScope('pokemonProfile')],
  },
];
