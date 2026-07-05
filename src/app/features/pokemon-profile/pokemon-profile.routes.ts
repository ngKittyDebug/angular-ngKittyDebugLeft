import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { TamagotchiSelectionService } from '@features/pokemon-tamagotchi/data/services/tamagotchi-selection.service';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';

import { provideEchartsCore } from 'ngx-echarts'; // <-- Используем Core-версию
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([RadarChart, TitleComponent, TooltipComponent, LegendComponent, SVGRenderer]);

export const pokemonProfileRoutes: Routes = [
  {
    path: 'pokemon/:pokemonEndpoint',
    loadComponent: () =>
      import('./ui/components/pokemon-profile-page/pokemon-profile-page.component').then(
        (m) => m.PokemonProfilePageComponent,
      ),
    providers: [
      provideTranslocoScope('pokemonProfile'),
      provideEchartsCore({ echarts }),
      { provide: TAMAGOTCHI_SELECTION_PORT, useExisting: TamagotchiSelectionService },
    ],
  },
];
