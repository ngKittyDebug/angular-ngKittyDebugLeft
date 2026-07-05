import { FRENZY_PATH } from '@features/frenzy/frenzy.routes';
import { POKEMON_BATTLE_PATH } from '@features/pokemon-battle/pokemon-battle.routes';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';
import type { GameCard } from '../models/game-card.model';

export const GAMES_LIST: readonly GameCard[] = [
  {
    id: 'frenzy',
    routePath: FRENZY_PATH,
    gifSource: 'images/games/frenzy.gif',
  },
  {
    id: 'tamagotchi',
    routePath: TAMAGOTCHI_PATH,
    gifSource: 'images/games/tamagotchi.gif',
  },
  {
    id: 'pokemonBattle',
    routePath: POKEMON_BATTLE_PATH,
    gifSource: 'images/games/fight.gif',
  },
  {
    id: 'comingSoon',
    gifSource: 'images/games/inProgress.gif',
  },
];
