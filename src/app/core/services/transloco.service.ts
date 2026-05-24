import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class LanguageSwitcher {
  private readonly translocoService = inject(TranslocoService);
  private readonly availableLangs = this.translocoService.getAvailableLangs();

  private readonly currentLanguage = this.translocoService.activeLang;

  protected languages = this.availableLangs.map((lang) => {
    if (typeof lang === 'string') {
      return lang;
    } else {
      return lang.id;
    }
  });

  public languageSwitch() {
    if (this.currentLanguage() === 'en') {
      this.translocoService.setActiveLang('ru');
    } else {
      this.translocoService.setActiveLang('en');
    }
  }
}
