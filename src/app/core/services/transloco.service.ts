import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageSwitcher {
  private translocoService = inject(TranslocoService);
  private savedLang = localStorage.getItem('lang') ?? this.translocoService.getDefaultLang();
  private readonly changeToSavedLang = this.switchLanguage(this.savedLang);
  private readonly currentLanguage = this.translocoService.activeLang;
  private readonly langEffect = effect(() => {
    localStorage.setItem('lang', this.currentLanguage());
  });

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
    if (this.currentLanguage() === 'en') {
      this.switchLanguage('ru');
    } else {
      this.switchLanguage('en');
    }
  }
}
