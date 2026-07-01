import { httpResource } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
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
import { AvatarPickerCardComponent } from './avatar-picker-card.component';

const MOBILE_BREAKPOINT = '(max-width: 550px)';

@Component({
  selector: 'left-paw-avatar-picker',
  imports: [TranslocoDirective, TuiButton, AvatarPickerCardComponent],
  templateUrl: './avatar-picker.component.html',
  styleUrl: './avatar-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerComponent {
  private readonly pokemonApiService = inject(PokemonApiService);

  public readonly closed = output<void>();
  public readonly avatarSelected = output<string>();

  protected readonly pageSize = toSignal(
    inject(BreakpointObserver)
      .observe(MOBILE_BREAKPOINT)
      .pipe(map((result) => (result.matches ? 6 : 8))),
    { initialValue: 8 },
  );

  protected readonly currentPage = signal(0);

  protected readonly pokemonList = httpResource<PokemonListApiData>(() =>
    this.pokemonApiService.getPokemonPageUrl(this.pageSize(), this.currentPage() * this.pageSize()),
  );

  protected readonly items = computed<(PokemonListItemApiData | null)[]>(() => {
    const results = this.pokemonList.value()?.results;

    return results ?? Array.from({ length: this.pageSize() }, (): null => null);
  });

  protected readonly hasNext = computed(() => !!this.pokemonList.value()?.next);
  protected readonly hasPrev = computed(() => this.currentPage() > 0);

  constructor() {
    effect(() => {
      this.pageSize();
      this.currentPage.set(0);
    });
  }

  protected onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected onSelect(avatarUrl: string): void {
    this.avatarSelected.emit(avatarUrl);
    this.closed.emit();
  }

  protected nextPage(): void {
    this.currentPage.update((page) => page + 1);
  }

  protected prevPage(): void {
    this.currentPage.update((page) => page - 1);
  }
}
