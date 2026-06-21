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
  protected readonly name = signal('');
  protected readonly selectedGenerationList = signal<string | null>(null);

  protected readonly selectedTypeList = signal<Set<string>>(new Set());

  protected readonly isLimitReached = computed(() => this.selectedTypeList().size >= 2);

  protected setActive(id: string): void {
    this.selectedGenerationList.update((currentId) => (currentId === id ? null : id));
  }

  protected onNameInput(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.name.set(target.value);
    }
  }

  protected toggleType(type: string): void {
    const currentSet = new Set(this.selectedTypeList());

    if (currentSet.has(type)) {
      currentSet.delete(type);
    } else if (currentSet.size < 2) {
      currentSet.add(type);
    }

    this.selectedTypeList.set(currentSet);
  }

  protected onSearchClick(): void {
    this.facade.currentPage.set(0);
    this.facade.filterByName.set(this.name());
    this.facade.filterByTypes.set(Array.from(this.selectedTypeList()));
    this.facade.filterByGenerations.set(this.selectedGenerationList() ?? '');
  }
}
