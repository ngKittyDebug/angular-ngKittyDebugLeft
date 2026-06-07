import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogFilterComponent } from '../filter/catalog-filter/catalog-filter.component';
import { CatalogPaginationComponent } from '../pagination/catalog-pagination/catalog-pagination.component';
import { PokemonCardComponent } from '../pokemon-card/pokemon-card.component';
import { PokemonPaginationService } from '@core/services/pokemon/pokemon-pagination.service';
import { TuiLoader, tuiLoaderOptionsProvider } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-main-catalog-page',
  imports: [CatalogFilterComponent, CatalogPaginationComponent, PokemonCardComponent, TuiLoader],
  templateUrl: './main-catalog-page.component.html',
  styleUrl: './main-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiLoaderOptionsProvider({ size: 'xxl' })],
})
export class MainCatalogPageComponent {
  protected pokemonPaginationService = inject(PokemonPaginationService);
}
