import { TranslocoTestingModule } from '@jsverse/transloco';

export const TranslocoTestingMock = TranslocoTestingModule.forRoot({
  langs: { en: {}, ru: {} },
  translocoConfig: {
    availableLangs: ['ru', 'en'],
    defaultLang: 'ru',
  },
});
