import { computed, inject, Injectable } from '@angular/core';
import { TUI_DARK_MODE } from '@taiga-ui/core';

export type AppThemeIcon = 'light' | 'dark';

const AppThemeIcons = {
  light: '@tui.sun',
  dark: '@tui.moon',
} as const;

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService {
  private readonly darkMode = inject(TUI_DARK_MODE);

  public readonly themeIcon = computed(() => {
    return this.darkMode() ? AppThemeIcons.dark : AppThemeIcons.light;
  });

  public toggleTheme(): void {
    this.darkMode.set(!this.darkMode());
  }
}
