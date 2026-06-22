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
    // `frenzy-debug` is the dev-only scope for the perf readout (row labels + metric-info hints). Lazy: Transloco
    // fetches it only when a `frenzy-debug` template first renders, i.e. under `?debug=perf` — a normal player never
    // loads it. The explicit `alias` keeps the hyphenated scope name as the translation namespace — without it
    // Transloco camelCases the namespace to `frenzyDebug`, so `prefix: 'frenzy-debug'` reads would miss.
    providers: [
      provideTranslocoScope('frenzy'),
      provideTranslocoScope({ scope: 'frenzy-debug', alias: 'frenzy-debug' }),
      ...FRENZY_PROVIDERS,
    ],
  },
];
