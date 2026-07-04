import { provideTaiga } from '@taiga-ui/core';
import type { ApplicationConfig } from '@angular/core';
import {
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { authBearerInterceptor } from '@core/interceptors/auth-bearer.interceptor';
import { authRefreshInterceptor } from '@core/interceptors/auth-refresh.interceptor';
import { authInitializer } from '@core/initializers/auth-initializer';

export const appConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideStore(),
    provideHttpClient(withInterceptors([authRefreshInterceptor, authBearerInterceptor])),
    provideAppInitializer(authInitializer),
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
  ],
} satisfies ApplicationConfig;
