import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';
import { TuiArcChart } from '@taiga-ui/addon-charts';
import { TuiCard } from '@taiga-ui/layout';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

@Component({
  selector: 'left-paw-pokemon-profile-info',
  imports: [TuiBadge, TuiButton, TuiProgress, TuiArcChart, TuiCard, TranslocoDirective],
  templateUrl: './pokemon-profile-info.component.html',
  styleUrl: './pokemon-profile-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfileInfoComponent {
  public readonly pokemonProfileData = input.required<PokemonDetailApiData | null>();
  protected readonly pokemonWeight = computed(() => {
    const weight = Number(this.pokemonProfileData()?.weight) / 10;

    return weight;
  });
  protected readonly pokemonHeight = computed(() => {
    const height = Number(this.pokemonProfileData()?.height) / 10;

    return height;
  });
}
