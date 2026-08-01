import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { authGuard } from '@shared/guards/auth.guard';
import { PokemonBattleStore } from './data/store/pokemon-battle.store';
import { PokemonBattleApiService } from './data/api/pokemon/services/pokemon-battle-api.service';
import { AudioManagerService } from './data/services/audio-manager.service';
import { BotPlayerService } from './data/services/bot-player.service';

export const POKEMON_BATTLE_PATH = 'pokemon-battle';
export const pokemonBattleRoutes: Routes = [
  {
    path: POKEMON_BATTLE_PATH,
    providers: [
      provideTranslocoScope('pokemon-battle'),
      PokemonBattleStore,
      PokemonBattleApiService,
      AudioManagerService,
      BotPlayerService,
    ],
    loadComponent: () =>
      import('./ui/components/pokemon-battle-page/pokemon-battle-page.component').then(
        (m) => m.PokemonBattlePageComponent,
      ),
    canActivate: [authGuard],
  },
];
