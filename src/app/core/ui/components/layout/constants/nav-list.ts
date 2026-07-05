import { MAIN_PATH } from '@features/main-catalog/main-catalog.routes';
import { PROFILE_PATH } from '@features/profile/profile.routes';
import { GAMES_PATH } from '@features/games/games.routes';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';

export const NAV_LIST_ITEMS = [
  {
    label: 'header.pokemon',
    icon: '@tui.paw-print',
    link: `/${GAMES_PATH}/${TAMAGOTCHI_PATH}`,
  },
  {
    label: 'header.games',
    icon: '@tui.gamepad-2',
    link: `/${GAMES_PATH}`,
  },
  {
    label: 'header.catalog',
    icon: '@tui.panel-top-bottom-dashed',
    link: `/${MAIN_PATH}`,
  },
  {
    label: 'header.profile',
    icon: '@tui.user',
    link: `/${PROFILE_PATH}`,
  },
];
