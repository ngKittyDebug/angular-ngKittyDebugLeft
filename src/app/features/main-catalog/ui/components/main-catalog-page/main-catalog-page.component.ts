import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { CatalogFilterComponent } from '../filter/catalog-filter/catalog-filter.component';
import { CatalogPaginationComponent } from '../pagination/catalog-pagination/catalog-pagination.component';
import { PokemonCardComponent } from '../pokemon-card/pokemon-card.component';
import { TuiLoader, tuiLoaderOptionsProvider } from '@taiga-ui/core';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';

@Component({
  selector: 'left-paw-main-catalog-page',
  imports: [
    CatalogFilterComponent,
    CatalogPaginationComponent,
    PokemonCardComponent,
    TuiLoader,
    TranslocoDirective,
  ],
  templateUrl: './main-catalog-page.component.html',
  styleUrl: './main-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiLoaderOptionsProvider({ size: 'xxl' }), provideTranslocoScope('main')],
})
export class MainCatalogPageComponent {
  protected catalogFacade = inject(MainCatalogFacade);
}
