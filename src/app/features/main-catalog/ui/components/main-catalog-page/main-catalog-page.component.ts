import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CatalogFilterComponent } from '../filter/catalog-filter/catalog-filter.component';
import { CatalogPaginationComponent } from '../pagination/catalog-pagination/catalog-pagination.component';
import { PokemonCardComponent } from '../pokemon-card/pokemon-card.component';
import { CatalogPageMocks } from './constants/catalog-page-mocks';

@Component({
  selector: 'left-paw-main-catalog-page',
  imports: [CatalogFilterComponent, CatalogPaginationComponent, PokemonCardComponent],
  templateUrl: './main-catalog-page.component.html',
  styleUrl: './main-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainCatalogPageComponent {
  protected readonly catalogPageMocks = CatalogPageMocks;
}
