import { TitleCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-pokemon-card',
  imports: [TuiProgress, TuiBadge, TitleCasePipe, RouterLink],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  public readonly pokemonName = input.required<string>();
  protected readonly pokemonCardData = signal<PokemonDetailApiData | null>(null);
  protected readonly pokemonLimitedStats = computed(() => {
    const data = this.pokemonCardData();

    return data?.stats?.slice(0, 3) ?? [];
  });

  public ngOnInit(): void {
    this.http
      .get<PokemonDetailApiData>(`${POKEMON_BASE_API}/pokemon/${this.pokemonName()}`)
      .subscribe((data) => this.pokemonCardData.set(data));
  }
}
