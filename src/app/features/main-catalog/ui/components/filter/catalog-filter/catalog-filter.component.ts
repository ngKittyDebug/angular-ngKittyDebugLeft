import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-catalog-filter',
  imports: [TuiTextfieldComponent, TuiInput, TuiLabel, TranslocoDirective],
  templateUrl: './catalog-filter.component.html',
  styleUrl: './catalog-filter.component.scss',
  providers: [provideTranslocoScope('main')],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFilterComponent {
  protected catalogFacade = inject(MainCatalogFacade);

  protected onFilterInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const name = event.target.value;

    this.catalogFacade.currentPage.set(0);
    this.catalogFacade.filterByName.set(name);
  }
}
