import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { TamagotchiSelectionFacade } from '@features/pokemon-profile/data/facades/tamagotchi-selection.facade';
import { authGuard } from '@shared/guards/auth.guard';
import { pokemonExistsCanMatch } from '@shared/guards/pokemon-exists.guard';

echarts.use([RadarChart, TitleComponent, TooltipComponent, LegendComponent, SVGRenderer]);

export const pokemonProfileRoutes: Routes = [
  {
    path: 'pokemon/:pokemonEndpoint',
    canActivate: [authGuard],
    canMatch: [pokemonExistsCanMatch],
    loadComponent: () =>
      import('./ui/components/pokemon-profile-page/pokemon-profile-page.component').then(
        (m) => m.PokemonProfilePageComponent,
      ),
    providers: [
      provideTranslocoScope('pokemonProfile'),
      provideEchartsCore({ echarts }),
      TamagotchiSelectionFacade,
    ],
  },
];
