import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { authGuard } from '@shared/guards/auth.guard';

export const PROFILE_PATH = 'profile';
export const profileRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./ui/components/profile/profile.component').then((m) => m.ProfileComponent),
    providers: [provideTranslocoScope('profile')],
    canActivate: [authGuard],
  },
];
