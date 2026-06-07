import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { DivideByTenPipe } from '@shared/pipes/divide-by-ten.pipe';

@Component({
  selector: 'left-paw-pokemon-profile-info',
  imports: [TuiBadge, TuiButton, TuiProgress, TuiCard, TranslocoDirective, DivideByTenPipe],
  templateUrl: './pokemon-profile-info.component.html',
  styleUrl: './pokemon-profile-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfileInfoComponent {
  public readonly pokemonProfileData = input.required<PokemonDetailApiData>();
  protected readonly pokemonWeight = computed(() => {
    const weight = Number(this.pokemonProfileData()?.weight) / 10;

    return weight;
  });
  protected readonly pokemonHeight = computed(() => {
    const height = Number(this.pokemonProfileData()?.height) / 10;

    return height;
  });
}
