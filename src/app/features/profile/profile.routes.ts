import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const PROFILE_PATH = 'profile';
export const profileRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./ui/components/profile/profile.component').then((m) => m.ProfileComponent),
    providers: [provideTranslocoScope('profile')],
  },
];
