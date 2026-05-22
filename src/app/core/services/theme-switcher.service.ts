import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService {
  public readonly currentTheme = signal<AppTheme>('dark');

  public toggleTheme(): void {
    this.currentTheme.update((theme) => {
      const nextTheme: AppTheme = theme === 'light' ? 'dark' : 'light';

      return nextTheme;
    });
  }
}
