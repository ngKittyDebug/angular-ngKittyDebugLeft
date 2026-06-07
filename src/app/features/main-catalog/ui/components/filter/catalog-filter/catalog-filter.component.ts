import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PokemonPaginationService } from '@core/services/pokemon/pokemon-pagination.service';
import { TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-catalog-filter',
  imports: [TuiTextfieldComponent, TuiInput, TuiLabel],
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
