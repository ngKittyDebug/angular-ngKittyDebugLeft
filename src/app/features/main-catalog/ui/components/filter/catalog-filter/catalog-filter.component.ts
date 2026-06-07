import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PokemonPaginationService } from '@core/services/pokemon/pokemon-pagination.service';
import { TuiInput, TuiLabel } from '@taiga-ui/core';
import { TuiDataListWrapper } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-catalog-filter',
  imports: [TuiDataListWrapper, TuiInput, TuiLabel],
  templateUrl: './catalog-filter.component.html',
  styleUrl: './catalog-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFilterComponent {
  protected pokemonPaginationService = inject(PokemonPaginationService);

  protected onFilterInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const name = event.target.value;

    this.pokemonPaginationService.currentPage.set(0);
    this.pokemonPaginationService.filterByName.set(name);
  }
}
