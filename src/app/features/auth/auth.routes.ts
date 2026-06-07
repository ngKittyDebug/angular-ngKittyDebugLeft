import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { guestGuard } from '@shared/guards/guest.guard';
import { LoginFormService } from './data/services/login-form.service';
import { SignupFormService } from './data/services/signup-form.service';

export const authRoutes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./ui/components/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
    providers: [provideTranslocoScope('auth')],
    canActivate: [guestGuard],
    children: [
      {
        path: '',
        redirectTo: 'signup',
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./ui/components/auth-page/login-form/login-form.component').then(
            (m) => m.LoginFormComponent,
          ),
        providers: [provideTranslocoScope('auth'), LoginFormService],
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./ui/components/auth-page/signup-form/signup-form.component').then(
            (m) => m.SignupFormComponent,
          ),
        providers: [provideTranslocoScope('auth'), SignupFormService],
      },
    ],
  },
];
