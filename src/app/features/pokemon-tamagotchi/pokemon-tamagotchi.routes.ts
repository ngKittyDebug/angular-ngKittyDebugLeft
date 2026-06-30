import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { TamagotchiEffects } from './data/store/tamagotchi.effects';
import { tamagotchiReducer } from './data/store/tamagotchi.reducer';
import { TAMAGOTCHI_FEATURE_KEY } from './data/store/tamagotchi.state';

export const TAMAGOTCHI_PATH = 'tamagotchi';

export const pokemonTamagotchiRoutes: Routes = [
  {
    path: TAMAGOTCHI_PATH,
    loadComponent: () =>
      import('./ui/components/pokemon-tamagotchi-page/pokemon-tamagotchi-page.component').then(
        (m) => m.PokemonTamagotchiPageComponent,
      ),
    providers: [
      provideTranslocoScope('pokemonTamagotchi'),
      provideState(TAMAGOTCHI_FEATURE_KEY, tamagotchiReducer),
      provideEffects(TamagotchiEffects),
    ],
  },
];
