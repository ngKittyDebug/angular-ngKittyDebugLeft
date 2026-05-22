import { computed, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const AppThemeNames = {
  light: 'light',
  dark: 'dark',
} as const;

const AppThemeIcons = {
  light: '@tui.sun',
  dark: '@tui.moon',
} as const;

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService {
  public readonly currentTheme = signal<AppTheme>(AppThemeNames.dark);

  public readonly themeIcon = computed(() => {
    return this.currentTheme() === AppThemeNames.light ? AppThemeIcons.light : AppThemeIcons.dark;
  });

  public toggleTheme(): void {
    this.currentTheme.update((theme) => {
      const nextTheme: AppTheme =
        theme === AppThemeNames.light ? AppThemeNames.dark : AppThemeNames.light;

      return nextTheme;
    });
  }
}
