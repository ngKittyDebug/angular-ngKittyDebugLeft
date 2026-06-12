import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { TuiIcon } from '@taiga-ui/core';

export const POKEMON_TYPES = [
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ghost',
  'dragon',
] as const;

export const POKEMON_GENERATIONS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
] as const;

type PokemonType = (typeof POKEMON_TYPES)[number];
type PokemonGeneration = (typeof POKEMON_GENERATIONS)[number];

@Component({
  selector: 'left-paw-catalog-filter',
  standalone: true,
  imports: [FormsModule, TranslocoDirective, TuiIcon],
  templateUrl: './catalog-filter.component.html',
  styleUrl: './catalog-filter.component.scss',
  providers: [provideTranslocoScope('main')],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFilterComponent {
  protected readonly facade = inject(MainCatalogFacade);

  protected readonly expanded = signal(false);

  protected readonly types = POKEMON_TYPES;
  protected readonly generations = POKEMON_GENERATIONS;

  protected selectedTypes: PokemonType[] = [];
  protected selectedGenerations: PokemonGeneration[] = [];
  protected name = '';

  protected filterByName(value: string): void {
    this.name = value;
  }
  protected toggleType(type: PokemonType): void {
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter((t) => t !== type)
      : [...this.selectedTypes, type];
  }
  protected toggleGeneration(gen: PokemonGeneration): void {
    this.selectedGenerations = this.selectedGenerations.includes(gen)
      ? this.selectedGenerations.filter((g) => g !== gen)
      : [...this.selectedGenerations, gen];
  }
  protected onSearchClick(): void {
    this.facade.currentPage.set(0);
    this.facade.filterByName.set(this.name);
    this.facade.filterByTypes.set(this.selectedTypes);
    this.facade.filterByGenerations.set(this.selectedGenerations);
  }
}
