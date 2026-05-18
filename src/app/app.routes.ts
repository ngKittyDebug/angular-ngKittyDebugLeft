import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/ui/components/layout/layout.component').then((m) => m.LayoutComponent),

    //Сюда мы будем прописывать все роуты, наш главный компонент это LayoutComponent, в нем будут жить наши Header and Footer компоненты
    children: [],
  },
];
