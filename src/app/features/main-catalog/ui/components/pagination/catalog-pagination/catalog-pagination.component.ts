import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { TuiPagination } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-catalog-pagination',
  imports: [TuiPagination],
  templateUrl: './catalog-pagination.component.html',
  styleUrl: './catalog-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPaginationComponent {
  protected catalogFacade = inject(MainCatalogFacade);
}
