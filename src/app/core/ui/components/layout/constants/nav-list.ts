import { aboutRoutes } from '@features/about/about.routes';
import { mainCatalogRoutes } from '@features/main-catalog/main-catalog.routes';
import { profileRoutes } from '@features/profile/profile.routes';
import { frenzyRoutes } from '@features/frenzy/frenzy.routes';

export const NAV_LIST_ITEMS = [
  {
    label: 'header.pokemon',
    icon: '@tui.paw-print',
    link: '#',
  },
  {
    label: 'header.frenzy',
    icon: '@tui.gamepad-2',
    link: `/${frenzyRoutes[0].path}`,
  },
  {
    label: 'header.catalog',
    icon: '@tui.panel-top-bottom-dashed',
    link: `/${mainCatalogRoutes[0].path}`,
  },
  {
    label: 'header.profile',
    icon: '@tui.user',
    link: `/${profileRoutes[0].path}`,
  },
  {
    label: 'header.about',
    icon: '@tui.heart-handshake',
    link: `/${aboutRoutes[0].path}`,
  },
];
