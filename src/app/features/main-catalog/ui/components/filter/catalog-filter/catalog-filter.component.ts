import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { TuiIcon } from '@taiga-ui/core';

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

  protected readonly selectedTypeList = signal<string[]>([]);
  protected readonly selectedGenerationList = signal<string[]>([]);
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

  protected toggleType(type: string): void {
    this.selectedTypeList.update((list) => {
      return list.includes(type) ? list.filter((t) => t !== type) : [...list, type];
    });
  }

  protected toggleGeneration(gen: string): void {
    this.selectedGenerationList.update((list) => {
      return list.includes(gen) ? list.filter((g) => g !== gen) : [...list, gen];
    });
  }

  protected onSearchClick(): void {
    this.facade.currentPage.set(0);
    this.facade.filterByName.set(this.name());
    this.facade.filterByTypes.set(this.selectedTypeList());
    this.facade.filterByGenerations.set(this.selectedGenerationList());
  }
}
