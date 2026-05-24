import { provideTaiga } from '@taiga-ui/core';
import type { ApplicationConfig } from '@angular/core';
import {
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideHttpClient } from '@angular/common/http';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideZoneChangeDetection(),
    provideTaiga(),
    provideStore(),
    provideHttpClient(),
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
  ],
};
