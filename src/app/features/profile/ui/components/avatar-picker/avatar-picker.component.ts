import { httpResource } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { map } from 'rxjs';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import type {
  PokemonListApiData,
  PokemonListItemApiData,
} from '@shared/models/pokemon-list-api-data-interface';
import { AvatarPickerCardComponent } from './avatar-picker-card/avatar-picker-card.component';

const MOBILE_BREAKPOINT = '(max-width: 550px)';
const MOBILE_PAGE_SIZE = 4;
const DESKTOP_PAGE_SIZE = 8;

@Component({
  selector: 'left-paw-avatar-picker',
  imports: [TranslocoDirective, TuiButton, AvatarPickerCardComponent],
  templateUrl: './avatar-picker.component.html',
  styleUrl: './avatar-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerComponent {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly avatarSelected = output<string>();

  protected readonly pageSize = toSignal(
    inject(BreakpointObserver)
      .observe(MOBILE_BREAKPOINT)
      .pipe(map((result) => (result.matches ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE))),
    { initialValue: DESKTOP_PAGE_SIZE },
  );

  protected readonly currentPage = linkedSignal(() => {
    this.pageSize();

    return 0;
  });

  protected readonly pokemonList = httpResource<PokemonListApiData>(() =>
    this.pokemonApiService.getPokemonPageUrl(this.pageSize(), this.currentPage() * this.pageSize()),
  );

  protected readonly items = computed<(PokemonListItemApiData | null)[]>(() => {
    const results = this.pokemonList.value()?.results;

    return results ?? Array.from({ length: this.pageSize() }, (): null => null);
  });

  protected readonly hasNext = computed(() => !!this.pokemonList.value()?.next);
  protected readonly hasPrev = computed(() => this.currentPage() > 0);

  protected onSelect(avatarUrl: string): void {
    this.avatarSelected.emit(avatarUrl);
  }

  protected nextPage(): void {
    this.currentPage.update((page) => page + 1);
  }

  protected prevPage(): void {
    this.currentPage.update((page) => page - 1);
  }
}
