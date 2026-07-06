import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { NgxEchartsDirective } from 'ngx-echarts';
import { createRadarChartOptions } from '@features/pokemon-profile/data/helpers/pokemon-profile-radar';
import { STAT_PROGRESS_MAX } from '@features/pokemon-profile/data/constants/pokemon-profile.constants';

@Component({
  selector: 'left-paw-pokemon-profile-stats',
  imports: [TuiProgress, TuiCard, TranslocoDirective, NgxEchartsDirective],
  templateUrl: './pokemon-profile-stats.component.html',
  styleUrl: './pokemon-profile-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfileStatsComponent {
  private readonly transloco = inject(TranslocoService);

  public readonly pokemonProfileData = input.required<PokemonDetailApiData>();

  protected readonly statProgressMax = STAT_PROGRESS_MAX;

  protected readonly pokemonTotalStats = computed(() => {
    const stats = this.pokemonProfileData()?.stats ?? [];

    return stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);
  });

  protected readonly pokemonStatsValues = computed(() => {
    const stats = this.pokemonProfileData()?.stats ?? [];

    return stats.map((s) => s.base_stat ?? 0);
  });

  protected readonly radarOptions = computed(() =>
    createRadarChartOptions(
      this.pokemonProfileData()?.stats ?? [],
      this.pokemonStatsValues(),
      this.pokemonProfileData()?.name ?? 'POKEMON',
      (key: string) => this.transloco.translate(key),
    ),
  );
}
