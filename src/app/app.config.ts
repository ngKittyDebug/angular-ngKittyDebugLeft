import { provideTaiga } from '@taiga-ui/core';
import type { ApplicationConfig } from '@angular/core';
import {
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideSignalFormsConfig } from '@angular/forms/signals';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideHttpClient } from '@angular/common/http';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { provideEchartsCore } from 'ngx-echarts'; // <-- Используем Core-версию
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([RadarChart, TitleComponent, TooltipComponent, LegendComponent, SVGRenderer]);

export const appConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideStore(),
    provideHttpClient(),
    provideTaiga(),
    provideTransloco({
      config: {
        availableLangs: ['en', 'ru'],
        defaultLang: 'ru',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoPersistLang({
      storage: {
        useValue: localStorage,
      },
    }),
    provideSignalFormsConfig({
      classes: {
        'tui-invalid': (field) => field.state().invalid() && field.state().touched(),
        'ng-touched': (field) => field.state().touched(),
        'ng-invalid': (field) => field.state().invalid(),
        'ng-dirty': (field) => field.state().dirty(),
      },
    }),
    provideEchartsCore({ echarts }),
  ],
} satisfies ApplicationConfig;
