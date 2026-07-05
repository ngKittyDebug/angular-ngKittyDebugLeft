import { ABOUT_PATH } from '@features/about/about.routes';
import { MAIN_PATH } from '@features/main-catalog/main-catalog.routes';
import { PROFILE_PATH } from '@features/profile/profile.routes';
import { FRENZY_PATH } from '@features/frenzy/frenzy.routes';
import { GAMES_PATH } from '@features/games/games.routes';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';

export const NAV_LIST_ITEMS = [
  {
    label: 'header.pokemon',
    icon: '@tui.paw-print',
    link: `/${GAMES_PATH}/${TAMAGOTCHI_PATH}`,
  },
  {
    label: 'header.frenzy',
    icon: '@tui.gamepad-2',
    link: `/${GAMES_PATH}/${FRENZY_PATH}`,
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
  {
    label: 'header.about',
    icon: '@tui.heart-handshake',
    link: `/${ABOUT_PATH}`,
  },
];
