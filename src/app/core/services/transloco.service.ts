import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class LanguageSwitcher {
  private translocoService = inject(TranslocoService);

  private availableLangs = this.translocoService.getAvailableLangs();
  protected languages = this.availableLangs.map((lang) => {
    if (typeof lang === 'string') {
      return lang;
    } else {
      return lang.id;
    }
  });

  public switchLanguage(lang: string) {
    this.translocoService.setActiveLang(lang);
  }
  public languageSwitch() {
    if (this.translocoService.activeLang() === 'en') {
      this.switchLanguage('ru');
    } else {
      this.switchLanguage('en');
    }
  }
}
