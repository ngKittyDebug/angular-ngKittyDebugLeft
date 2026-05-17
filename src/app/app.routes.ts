import type { Routes } from '@angular/router';
import { NotFoundPageComponent } from '@features/not-found/ui/components/not-found-page/not-found-page.component';

export const routes: Routes = [
  {
    path: '**',
    component: NotFoundPageComponent,
  },
];
