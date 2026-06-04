import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Service()
export class LanguageSwitcherService {
  private readonly translocoService = inject(TranslocoService);
  private readonly availableLangs = this.translocoService.getAvailableLangs();

  public readonly currentLanguage = this.translocoService.activeLang;

  public readonly languages = this.availableLangs.map((lang) => {
    if (typeof lang === 'string') {
      return lang;
    } else {
      return lang.id;
    }
  });

  public languageSwitch(lang: string) {
    this.translocoService.setActiveLang(lang);
  }
}
