import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PokemonPaginationService } from '@core/services/pokemon/pokemon-pagination.service';
import { TuiPagination } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-catalog-pagination',
  imports: [TuiPagination],
  templateUrl: './catalog-pagination.component.html',
  styleUrl: './catalog-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPaginationComponent {
  protected pokemonPaginationService = inject(PokemonPaginationService);
}
