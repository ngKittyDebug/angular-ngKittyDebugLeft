import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { FRENZY_PROVIDERS } from './frenzy.providers';

export const FRENZY_PATH = 'frenzy';
export const frenzyRoutes: Routes = [
  {
    path: 'frenzy',
    // Immersive, fixed-viewport shell: the layout pins itself to a definite viewport height so the
    // full-bleed, no-scroll play area never overflows (see LayoutComponent).
    data: { immersive: true },
    loadComponent: () =>
      import('./ui/components/frenzy-page/frenzy-page.component').then(
        (m) => m.FrenzyPageComponent,
      ),
    providers: [provideTranslocoScope('frenzy'), ...FRENZY_PROVIDERS],
  },
];
