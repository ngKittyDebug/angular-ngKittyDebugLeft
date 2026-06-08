import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/ui/components/layout/layout.component').then((m) => m.LayoutComponent),
    providers: [provideTranslocoScope('header')],

    //Сюда мы будем прописывать все роуты, наш главный компонент это LayoutComponent, в нем будут жить наши Header and Footer компоненты
    loadChildren: () => import('./features/features.routes').then((m) => m.ChildrenRouts),
  },
];
