import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiArcChart } from '@taiga-ui/addon-charts';
import { TuiCard } from '@taiga-ui/layout';
import { TranslocoDirective } from '@jsverse/transloco';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

@Component({
  selector: 'left-paw-pokemon-profile-stats',
  imports: [TuiProgress, TuiArcChart, TuiCard, TranslocoDirective],
  templateUrl: './pokemon-profile-stats.component.html',
  styleUrl: './pokemon-profile-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfileStatsComponent {
  public readonly pokemonProfileData = input.required<PokemonDetailApiData | null>();
  protected readonly pokemonTotalStats = computed(() => {
    const stats = this.pokemonProfileData()?.stats ?? [];

    return stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);
  });

  protected readonly pokemonStatsValues = computed(() => {
    const stats = this.pokemonProfileData()?.stats ?? [];

    return stats.map((s) => s.base_stat ?? 0);
  });
}
