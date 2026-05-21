import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class LanguageSwitcher {
  private translocoService = inject(TranslocoService);
  public currentLanguage: string;
  public languages: string[];

  constructor() {
    const availableLangs = this.translocoService.getAvailableLangs();

    this.currentLanguage = this.translocoService.getDefaultLang();
    this.languages = availableLangs.map((lang) => (typeof lang === 'string' ? lang : lang.id));
  }

  public switchLanguage(lang: string) {
    this.translocoService.setActiveLang(lang);
    this.currentLanguage = lang;
  }
  public languageSwitch() {
    if (this.currentLanguage === 'en') {
      this.switchLanguage('ru');
    } else {
      this.switchLanguage('en');
    }
  }
}
