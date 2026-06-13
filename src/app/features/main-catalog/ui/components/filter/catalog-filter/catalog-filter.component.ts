import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { TuiIcon } from '@taiga-ui/core';

const POKEMON_API = 'https://pokeapi.co/api/v2/';

interface PokeApiListResponse {
  results: { name: string }[];
}

type PokemonType = string;
type PokemonGeneration = string;

@Component({
  selector: 'left-paw-catalog-filter',
  imports: [FormsModule, TranslocoDirective, TuiIcon],
  templateUrl: './catalog-filter.component.html',
  styleUrl: './catalog-filter.component.scss',
  providers: [provideTranslocoScope('main')],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFilterComponent {
  protected readonly facade = inject(MainCatalogFacade);

  protected readonly expanded = signal(false);

  protected readonly typeListResource = resource({
    loader: (): Promise<PokemonType[]> =>
      fetch(`${POKEMON_API}type`)
        .then((r) => r.json() as Promise<PokeApiListResponse>)
        .then((data) => data.results.map((t) => t.name)),
  });

  protected readonly generationListResource = resource({
    loader: (): Promise<PokemonGeneration[]> =>
      fetch(`${POKEMON_API}generation`)
        .then((r) => r.json() as Promise<PokeApiListResponse>)
        .then((data) => data.results.map((g) => g.name)),
  });

  protected readonly selectedTypeList = signal<PokemonType[]>([]);
  protected readonly selectedGenerationList = signal<PokemonGeneration[]>([]);
  protected readonly name = signal('');

  protected readonly selectedCount = computed(
    () => this.selectedTypeList().length + this.selectedGenerationList().length,
  );

  protected onNameInput(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.name.set(target.value);
    }
  }

  protected toggleType(type: PokemonType): void {
    this.selectedTypeList.update((list) =>
      list.includes(type) ? list.filter((t) => t !== type) : [...list, type],
    );
  }

  protected toggleGeneration(gen: PokemonGeneration): void {
    this.selectedGenerationList.update((list) =>
      list.includes(gen) ? list.filter((g) => g !== gen) : [...list, gen],
    );
  }

  protected onSearchClick(): void {
    this.facade.currentPage.set(0);
    this.facade.filterByName.set(this.name());
    this.facade.filterByTypes.set(this.selectedTypeList());
    this.facade.filterByGenerations.set(this.selectedGenerationList());
  }
}
